<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Support\Arr;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * 礼包基础信息（登录用户可见）：背包卡片用于预载开启特效，避免开启时闪默认动画
 */
class PackInfoController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if ($actor->isGuest() || !$actor->can('mattoid-store.group-view')) {
            throw new PermissionDeniedException();
        }

        $id = (int) Arr::get($request->getQueryParams(), 'id');
        $pack = GiftPack::query()->find($id);

        return new JsonResponse([
            'data' => $pack ? [
                'id' => $pack->id,
                'name' => $pack->name,
                'icon' => $pack->icon,
                'openEffect' => (string) $pack->open_effect,
                // 礼包默认遮罩色：弹窗一打开就按此色替换默认遮罩（奖励级覆盖需等开奖结果）
                'overlayColor' => (string) $pack->overlay_color,
            ] : null,
        ]);
    }
}
