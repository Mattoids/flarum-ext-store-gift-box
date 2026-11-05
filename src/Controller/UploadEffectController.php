<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Support\Arr;
use Mattoid\StoreGiftBox\Upload\GiftBoxEffectUploader;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * 上传开启特效 GIF（管理端）
 */
class UploadEffectController implements RequestHandlerInterface
{
    protected $uploader;

    public function __construct(GiftBoxEffectUploader $uploader)
    {
        $this->uploader = $uploader;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (!$actor->can('mattoid-store.group-moderate')) {
            throw new PermissionDeniedException();
        }

        $file = Arr::get($request->getUploadedFiles(), 'file');
        if (!$file) {
            throw new PermissionDeniedException();
        }

        return new JsonResponse(['data' => ['path' => $this->uploader->upload($file)]]);
    }
}
