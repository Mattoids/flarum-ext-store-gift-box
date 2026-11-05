<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Foundation\ValidationException;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class UpdateGiftPackController implements RequestHandlerInterface
{
    use ValidatesGiftPack;

    protected $connection;

    public function __construct(ConnectionInterface $connection)
    {
        $this->connection = $connection;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->assertAdmin($request);
        $id = (int) Arr::get($request->getQueryParams(), 'id');
        $pack = GiftPack::query()->find($id);
        if (!$pack) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.pack-not-found')]);
        }

        $data = $this->validatedParams($request);

        $pack->update([
            'name' => $data['name'],
            'icon' => $data['icon'],
            'desc' => $data['desc'],
            'status' => $data['status'],
            'sort' => $data['sort'],
            'open_effect' => $data['openEffect'],
            'overlay_color' => $data['overlayColor'],
        ]);

        $this->replaceRewards($pack, $data['rewards'], $this->connection);
        $pack->load(['rewards' => function ($q) {
            $q->orderBy('sort')->orderBy('id');
        }]);

        return new JsonResponse(['data' => $this->packPayload($pack)]);
    }
}
