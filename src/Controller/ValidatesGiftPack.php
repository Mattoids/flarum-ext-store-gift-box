<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Foundation\ValidationException;
use Flarum\Group\Group;
use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Mattoid\Store\Model\StoreModel;
use Mattoid\StoreGiftBox\Service\GiftBoxDrawService;
use Psr\Http\Message\ServerRequestInterface;

/**
 * 礼包保存/更新共用的参数校验与入库逻辑
 */
trait ValidatesGiftPack
{
    protected function assertAdmin(ServerRequestInterface $request)
    {
        $actor = RequestUtil::getActor($request);
        if (!$actor->can('mattoid-store.group-moderate')) {
            throw new PermissionDeniedException();
        }

        return $actor;
    }

    protected function validatedParams(ServerRequestInterface $request): array
    {
        $params = $request->getParsedBody();
        $trans = resolve('translator');

        $name = trim((string) Arr::get($params, 'name', ''));
        if ($name === '' || mb_strlen($name) > 100) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.name-required')]);
        }

        $rewards = Arr::get($params, 'rewards', []);
        if (!is_array($rewards) || count($rewards) === 0) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.rewards-required')]);
        }
        if (count($rewards) > 100) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.rewards-too-many')]);
        }

        $cleanRewards = [];
        foreach ($rewards as $i => $reward) {
            $cleanRewards[] = $this->validateReward($reward, $i, $trans);
        }

        return [
            'name' => $name,
            'icon' => trim((string) Arr::get($params, 'icon', '')),
            'desc' => trim((string) Arr::get($params, 'desc', '')),
            'status' => Arr::get($params, 'status', 1) ? 1 : 0,
            'sort' => (int) Arr::get($params, 'sort', 0),
            'openEffect' => $this->validateOpenEffect(Arr::get($params, 'openEffect', '')),
            'openEffectDuration' => $this->validateOpenEffectDuration(Arr::get($params, 'openEffectDuration', 0)),
            'overlayColor' => $this->validateRewardBeamColor(Arr::get($params, 'overlayColor', '')),
            'rewards' => $cleanRewards,
        ];
    }

    protected function validateReward($reward, int $index, $trans): array
    {
        if (!is_array($reward)) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.reward-invalid')]);
        }

        $type = (string) Arr::get($reward, 'type', '');
        $weight = (int) Arr::get($reward, 'weight', 0);
        if (!in_array($type, [GiftBoxDrawService::TYPE_MONEY, GiftBoxDrawService::TYPE_GOODS, GiftBoxDrawService::TYPE_GROUP, GiftBoxDrawService::TYPE_CUSTOM], true)) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.reward-invalid')]);
        }
        if ($weight < 1 || $weight > 1000000) {
            throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.weight-invalid')]);
        }

        $config = Arr::get($reward, 'config', []);
        if (!is_array($config)) {
            $config = [];
        }

        switch ($type) {
            case GiftBoxDrawService::TYPE_MONEY:
                $amount = (float) ($config['amount'] ?? 0);
                if ($amount <= 0 || $amount > 100000000) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.money-amount-invalid')]);
                }
                $config = ['amount' => $amount];
                break;

            case GiftBoxDrawService::TYPE_GOODS:
                $storeId = (int) ($config['storeId'] ?? 0);
                if (!StoreModel::withTrashed()->where('id', $storeId)->exists()) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.goods-not-found')]);
                }
                $config = ['storeId' => $storeId];
                break;

            case GiftBoxDrawService::TYPE_GROUP:
                $groupIds = array_values(array_unique(array_filter(array_map('intval', (array) ($config['groupIds'] ?? [])))));
                if (empty($groupIds) || Group::query()->whereIn('id', $groupIds)->count() !== count($groupIds)) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.group-invalid')]);
                }
                $config = ['groupIds' => $groupIds];
                break;

            case GiftBoxDrawService::TYPE_CUSTOM:
                $label = trim((string) ($config['label'] ?? ''));
                if ($label === '') {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.custom-label-required')]);
                }
                $payload = $config['payload'] ?? null;
                if (is_string($payload) && $payload !== '' && json_decode($payload) === null && json_last_error() !== JSON_ERROR_NONE) {
                    throw new ValidationException(['message' => $trans->trans('mattoid-store-gift-box.admin.error.custom-payload-invalid')]);
                }
                $config = ['label' => mb_substr($label, 0, 200)];
                if ($payload !== null && $payload !== '') {
                    $config['payload'] = is_string($payload) ? json_decode($payload, true) : $payload;
                }
                break;
        }

        return [
            'type' => $type,
            'weight' => $weight,
            'status' => Arr::get($reward, 'status', 1) ? 1 : 0,
            'sort' => (int) Arr::get($reward, 'sort', $index),
            'beamColor' => $this->validateRewardBeamColor(Arr::get($reward, 'beamColor', '')),
            'beamEffect' => $this->validateBeamEffect(Arr::get($reward, 'beamEffect', 'beam')),
            'effectImage' => $this->validateEffectImage(Arr::get($reward, 'effectImage', '')),
            'overlayColor' => $this->validateRewardBeamColor(Arr::get($reward, 'overlayColor', '')),
            'config' => $config,
        ];
    }

    /**
     * 开启特效：留空或 /assets/ 开头的站内路径
     */
    protected function validateOpenEffect($path): string
    {
        $path = trim((string) $path);
        if ($path === '') {
            return '';
        }
        if (strpos($path, '/assets/') !== 0 || strlen($path) > 255) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.effect-path-invalid')]);
        }

        return $path;
    }

    /**
     * 开启特效时长（秒）：0 = 自动跟随 GIF/视频实际时长
     */
    protected function validateOpenEffectDuration($seconds): int
    {
        $seconds = (int) $seconds;

        return $seconds >= 0 && $seconds <= 600 ? $seconds : 0;
    }

    /** 开奖光效类型白名单 */
    const BEAM_EFFECTS = ['beam', 'burst', 'ring', 'rays', 'rain', 'glow', 'none'];

    /**
     * 开奖光效类型
     */
    protected function validateBeamEffect($effect): string
    {
        $effect = trim((string) $effect);
        if ($effect === '') {
            return 'beam';
        }
        if (!in_array($effect, self::BEAM_EFFECTS, true)) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.beam-effect-invalid')]);
        }

        return $effect;
    }

    /**
     * 开奖效果图片：留空或 /assets/ 开头的站内路径
     */
    protected function validateEffectImage($path): string
    {
        $path = trim((string) $path);
        if ($path === '') {
            return '';
        }
        if (strpos($path, '/assets/') !== 0 || strlen($path) > 255) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.effect-path-invalid')]);
        }

        return $path;
    }

    /**
     * 奖励项光束颜色：留空或 #RRGGBB
     */
    protected function validateRewardBeamColor($color): string
    {
        $color = trim((string) $color);
        if ($color === '') {
            return '';
        }
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.beam-color-invalid')]);
        }

        return strtolower($color);
    }

    protected function replaceRewards($pack, array $rewards, ConnectionInterface $connection): void
    {
        $connection->transaction(function () use ($pack, $rewards) {
            $pack->rewards()->delete();
            foreach ($rewards as $r) {
                // config 为 array cast：必须传数组，由模型负责编码，重复 json_encode 会导致双重编码
                $pack->rewards()->create([
                    'type' => $r['type'],
                    'weight' => $r['weight'],
                    'status' => $r['status'],
                    'sort' => $r['sort'],
                    'beam_color' => $r['beamColor'],
                    'beam_effect' => $r['beamEffect'],
                    'effect_image' => $r['effectImage'],
                    'overlay_color' => $r['overlayColor'],
                    'config' => $r['config'],
                ]);
            }
        });
    }

    protected function packPayload($pack): array
    {
        return [
            'id' => $pack->id,
            'name' => $pack->name,
            'icon' => $pack->icon,
            'desc' => $pack->desc,
            'status' => (int) $pack->status,
            'sort' => (int) $pack->sort,
            'openEffect' => (string) $pack->open_effect,
            'openEffectDuration' => (int) $pack->open_effect_duration,
            'overlayColor' => (string) $pack->overlay_color,
            'rewards' => $pack->rewards->map(function ($r) {
                return [
                    'id' => $r->id,
                    'type' => $r->type,
                    'config' => $this->decodeConfig($r->config),
                    'weight' => (int) $r->weight,
                    'status' => (int) $r->status,
                    'sort' => (int) $r->sort,
                    'beamColor' => (string) $r->beam_color,
                    'beamEffect' => (string) $r->beam_effect,
                    'effectImage' => (string) $r->effect_image,
                    'overlayColor' => (string) $r->overlay_color,
                ];
            })->all(),
        ];
    }

    /**
     * config 列在个别环境下 array cast 可能不生效，统一防御性解码
     */
    protected function decodeConfig($config)
    {
        if (is_array($config)) {
            return $config;
        }
        $decoded = json_decode((string) $config, true);

        return $decoded ?: [];
    }
}
