<?php

namespace Mattoid\StoreGiftBox\Goods;

use Carbon\Carbon;
use Flarum\User\User;
use Mattoid\Store\Model\StoreCartModel;
use Mattoid\Store\Model\StoreModel;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;
use Mattoid\StoreGiftBox\Service\GiftBoxDrawService;

/**
 * 一次性道具使用逻辑：开启礼包（加权随机抽奖）
 *
 * 从购买时冻结的快照中抽奖，之后的发放与记录同事务完成；
 * 任一步失败抛出异常，购买记录不会被消耗，用户可重试。
 */
class GiftBoxUse
{
    public static function use(User $actor, StoreModel $store, StoreCartModel $cart)
    {
        $snapshot = GiftPackSnapshot::query()
            ->where('cart_id', $cart->id)
            ->lockForUpdate()
            ->first();

        if (!$snapshot) {
            // 购买记录缺少冻结快照（历史数据/异常购买）：给出明确错误而非笼统的"使用失败"
            throw new ValidationException([
                'message' => resolve('translator')->trans('mattoid-store-gift-box.forum.error.snapshot-missing'),
            ]);
        }
        if ($snapshot->drawn_reward) {
            return false;
        }

        $reward = resolve(GiftBoxDrawService::class)->drawAndGrant($actor, $snapshot);

        // drawn_reward 为 array cast：直接赋值数组，由模型负责编码
        $snapshot->drawn_reward = $reward;
        $snapshot->drawn_at = Carbon::now();
        $snapshot->save();

        return true;
    }
}
