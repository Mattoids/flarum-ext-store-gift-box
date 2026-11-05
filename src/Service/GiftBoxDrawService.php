<?php

namespace Mattoid\StoreGiftBox\Service;

use Flarum\Foundation\ValidationException;
use Flarum\Group\Group;
use Flarum\User\User;
use Illuminate\Contracts\Events\Dispatcher;
use Mattoid\Store\Event\StoreBuyEvent;
use Mattoid\Store\Event\StoreCartAddEvent;
use Mattoid\Store\Event\StoreCartEditEvent;
use Mattoid\Store\Model\StoreCartModel;
use Mattoid\Store\Model\StoreModel;
use Mattoid\Store\Service\StoreMoneyManager;
use Mattoid\StoreGiftBox\Event\GiftBoxDrawEvent;
use Mattoid\StoreGiftBox\Model\GiftPackReward;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;

/**
 * 礼包抽奖服务：冻结（快照）/ 加权抽取 / 发奖
 */
class GiftBoxDrawService
{
    /** 奖励类型常量 */
    const TYPE_MONEY = 'money';
    const TYPE_GOODS = 'goods';
    const TYPE_GROUP = 'group';
    const TYPE_CUSTOM = 'custom';

    /** @var Dispatcher */
    private $events;

    public function __construct(Dispatcher $events)
    {
        $this->events = $events;
    }

    /**
     * 冻结奖励条目：把发奖所需配置与展示信息（名称/图标）一并快照，
     * 使背包内的奖池不随后台配置修改而变化
     */
    public function freezeReward(GiftPackReward $reward): array
    {
        $config = is_array($reward->config) ? $reward->config : json_decode((string) $reward->config, true);

        $frozen = [
            'id' => $reward->id,
            'type' => $reward->type,
            'weight' => (int) $reward->weight,
            'config' => $config ?: [],
        ];

        // 光效配置（奖励级，随快照冻结）
        $beamColor = trim((string) $reward->beam_color);
        if ($beamColor !== '') {
            $frozen['config']['beamColor'] = $beamColor;
        }
        $frozen['config']['beamEffect'] = in_array($reward->beam_effect, ['beam', 'burst', 'ring', 'rays', 'rain', 'glow', 'none'], true) ? $reward->beam_effect : 'beam';
        $effectImage = trim((string) $reward->effect_image);
        if ($effectImage !== '') {
            $frozen['config']['effectImage'] = $effectImage;
        }
        $overlayColor = trim((string) $reward->overlay_color);
        if ($overlayColor !== '') {
            $frozen['config']['overlayColor'] = $overlayColor;
        }

        switch ($reward->type) {
            case self::TYPE_GOODS:
                $store = StoreModel::withTrashed()->find((int) ($config['storeId'] ?? 0));
                $frozen['config']['title'] = $store ? $store->title : '';
                $frozen['config']['icon'] = $store ? (string) $store->icon : '';
                break;
            case self::TYPE_GROUP:
                $ids = array_map('intval', (array) ($config['groupIds'] ?? []));
                $frozen['config']['names'] = Group::query()->whereIn('id', $ids)->pluck('name_singular')->all();
                break;
        }

        return $frozen;
    }

    /**
     * 按冻结快照的权重加权抽取并发放奖励
     */
    public function drawAndGrant(User $user, GiftPackSnapshot $snapshot): array
    {
        $rewards = is_array($snapshot->rewards) ? $snapshot->rewards : json_decode((string) $snapshot->rewards, true);
        if (empty($rewards)) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.forum.error.pack-empty')]);
        }

        $total = 0;
        foreach ($rewards as $reward) {
            $total += max(0, (int) ($reward['weight'] ?? 0));
        }
        if ($total <= 0) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.forum.error.pack-empty')]);
        }

        $hit = random_int(1, $total);
        $acc = 0;
        $drawn = $rewards[0];
        foreach ($rewards as $reward) {
            $acc += max(0, (int) ($reward['weight'] ?? 0));
            if ($hit <= $acc) {
                $drawn = $reward;
                break;
            }
        }

        // grant 返回实际发放的奖励：唯一道具已拥有时会折算为等价金币
        $drawn = $this->grant($user, $drawn, $snapshot);

        return $drawn;
    }

    /**
     * 目标用户是否已持有该商品（status=1 且未过期）
     */
    protected function hasOwnedGoods(User $user, StoreModel $store): bool
    {
        return StoreCartModel::query()
            ->where('user_id', $user->id)
            ->where('store_id', $store->id)
            ->where('status', 1)
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->where('type', 'limit')->where('outtime', '>=', \Carbon\Carbon::now());
                })->orWhere('type', 'permanent');
            })
            ->exists();
    }

    /**
     * 按类型发放奖励；失败抛异常，由调用方事务回滚（购买记录不消耗）
     *
     * 返回"实际发放"的奖励：唯一商品道具用户已拥有时自动折算为等价金币，
     * 返回值即折算后的 money 奖励（开启记录也记为金币）。
     */
    public function grant(User $user, array $reward, GiftPackSnapshot $snapshot): array
    {
        $config = $reward['config'] ?? [];
        $trans = resolve('translator');

        switch ($reward['type']) {
            case self::TYPE_MONEY:
                $amount = (float) ($config['amount'] ?? 0);
                if ($amount <= 0) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.forum.error.reward-invalid')]);
                }
                $this->addMoney($user, $amount, $snapshot->pack_name, 'mattoid-store-gift-box.forum.money-history-draw');
                break;

            case self::TYPE_GOODS:
                $store = StoreModel::query()
                    ->where('id', (int) ($config['storeId'] ?? 0))
                    ->where('status', 1)
                    ->first();
                if (!$store) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.forum.error.reward-invalid')]);
                }

                // 唯一道具（不允许重复持有）且用户已拥有：折算为等价金币
                if ($store->repeat == 0 && $this->hasOwnedGoods($user, $store)) {
                    return $this->grantConvertedMoney($user, $reward, $store, $snapshot);
                }

                // 与管理员赠送同一链路：入购物车（自动减库存）→ 标记持有 → 通知商品插件发放权益
                $cartEvent = new StoreCartAddEvent($user, $store, 0);
                $this->events->dispatch($cartEvent);
                $cart = $cartEvent->cart;
                $cart->auto_deduction = 0;
                $cart->save();
                $cart->status = 1;
                $this->events->dispatch(new StoreCartEditEvent($cart));
                $this->events->dispatch(new StoreBuyEvent($user, $store, $cart, []));
                break;

            case self::TYPE_GROUP:
                $groupIds = array_filter(array_map('intval', (array) ($config['groupIds'] ?? [])));
                if (empty($groupIds)) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.forum.error.reward-invalid')]);
                }
                $user->groups()->syncWithoutDetaching($groupIds);
                break;

            case self::TYPE_CUSTOM:
                // 交由监听 GiftBoxDrawEvent 的其他扩展自行发奖
                $this->events->dispatch(new GiftBoxDrawEvent($user, $reward, $snapshot));
                break;

            default:
                throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.forum.error.reward-invalid')]);
        }

        return $reward;
    }

    /**
     * 唯一道具已拥有：按商品价格折算金币发放，返回折算后的奖励（money 类型）
     */
    protected function grantConvertedMoney(User $user, array $reward, StoreModel $store, GiftPackSnapshot $snapshot): array
    {
        $amount = (float) $store->price;
        if ($amount > 0) {
            $this->addMoney(
                $user,
                $amount,
                $snapshot->pack_name,
                'mattoid-store-gift-box.forum.money-history-convert',
                ['title' => $store->title]
            );
        }

        return [
            'id' => $reward['id'] ?? null,
            'type' => self::TYPE_MONEY,
            'weight' => $reward['weight'] ?? 0,
            'config' => [
                'amount' => $amount,
                'convertedFrom' => $store->id,
                'convertedTitle' => $store->title,
                'beamColor' => $config['beamColor'] ?? '',
            ],
        ];
    }

    /**
     * 发放金币（走商店资金体系，带流水）
     */
    protected function addMoney(User $user, float $amount, string $packName, string $sourceKey, array $params = []): void
    {
        $ok = resolve(StoreMoneyManager::class)->refund(
            $user,
            $amount,
            'GIFTBOXDRAW',
            $sourceKey,
            array_merge(['pack' => $packName], $params),
            ''
        );
        if (!$ok) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.forum.error.reward-grant-fail')]);
        }
    }
}
