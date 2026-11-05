<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Foundation\ValidationException;
use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Support\Arr;
use Mattoid\Store\Model\StoreModel;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class DeleteGiftPackController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (!$actor->can('mattoid-store.group-moderate')) {
            throw new PermissionDeniedException();
        }

        $id = (int) Arr::get($request->getQueryParams(), 'id');
        $pack = GiftPack::query()->find($id);
        if (!$pack) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.pack-not-found')]);
        }

        // 已有商店商品绑定该礼包时禁止删除，避免产生悬空商品
        $referenced = StoreModel::withTrashed()->where('code', 'gift-box')->where('subtype', (string) $id)->exists();
        if ($referenced) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.pack-in-use')]);
        }

        $pack->rewards()->delete();
        $pack->delete();

        return new JsonResponse(['data' => ['id' => $id]]);
    }
}
