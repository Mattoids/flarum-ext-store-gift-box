<?php

namespace Mattoid\StoreGiftBox\Controller;

use Illuminate\Database\ConnectionInterface;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class SaveGiftPackController implements RequestHandlerInterface
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
        $data = $this->validatedParams($request);

        $pack = GiftPack::query()->create([
            'name' => $data['name'],
            'icon' => $data['icon'],
            'desc' => $data['desc'],
            'status' => $data['status'],
            'sort' => $data['sort'],
            'open_effect' => $data['openEffect'],
            'open_effect_duration' => $data['openEffectDuration'],
            'overlay_color' => $data['overlayColor'],
        ]);

        $this->replaceRewards($pack, $data['rewards'], $this->connection);
        $pack->load(['rewards' => function ($q) {
            $q->orderBy('sort')->orderBy('id');
        }]);

        return new JsonResponse(['data' => $this->packPayload($pack)], 201);
    }
}
