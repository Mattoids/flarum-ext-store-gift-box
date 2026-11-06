<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Support\Arr;
use Mattoid\Store\Model\StoreCartModel;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * 查询某条购买记录的开启结果（仅物主本人）
 *
 * 前端开箱特效弹窗在使用成功后调用，获取抽中的奖励用于展示。
 */
class DrawnResultController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if ($actor->isGuest()) {
            throw new PermissionDeniedException();
        }

        $cartId = (int) Arr::get($request->getQueryParams(), 'cartId');
        $owned = StoreCartModel::query()
            ->where('id', $cartId)
            ->where('user_id', $actor->id)
            ->exists();
        if (!$owned) {
            throw new PermissionDeniedException();
        }

        $snapshot = GiftPackSnapshot::query()->where('cart_id', $cartId)->first();
        if (!$snapshot || !$snapshot->drawn_reward) {
            return new JsonResponse(['data' => null], 404);
        }

        $drawn = $snapshot->drawn_reward;
        if (!is_array($drawn)) {
            $drawn = json_decode((string) $drawn, true) ?: [];
        }

        return new JsonResponse([
            'data' => [
                'packName' => $snapshot->pack_name,
                'packIcon' => $snapshot->pack_icon,
                'beamColor' => (string) ($drawn['config']['beamColor'] ?? ''),
                'openEffect' => (string) $snapshot->pack_open_effect,
                'openEffectDuration' => (int) $snapshot->pack_open_effect_duration,
                // 遮罩色：奖励级优先，其次礼包默认
                'overlayColor' => (string) ($drawn['config']['overlayColor'] ?? $snapshot->pack_overlay_color),
                'drawn' => $snapshot->drawn_reward,
                'drawnAt' => $snapshot->drawn_at ? $snapshot->drawn_at->toIso8601String() : null,
            ],
        ]);
    }
}
