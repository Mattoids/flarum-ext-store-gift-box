<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * 礼包列表（管理端，含奖池）
 */
class ListGiftPackController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (!$actor->can('mattoid-store.group-moderate')) {
            throw new PermissionDeniedException();
        }

        $packs = GiftPack::query()
            ->with(['rewards' => function ($q) {
                $q->orderBy('sort')->orderBy('id');
            }])
            ->orderBy('sort')
            ->orderBy('id')
            ->get();

        return new JsonResponse([
            'data' => $packs->map(function (GiftPack $pack) {
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
                        $config = $r->config;
                        if (!is_array($config)) {
                            $config = json_decode((string) $config, true) ?: [];
                        }
                        return [
                            'id' => $r->id,
                            'type' => $r->type,
                            'config' => $config,
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
            })->all(),
        ]);
    }
}
