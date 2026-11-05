<?php

namespace Mattoid\StoreGiftBox\Listener;

use Mattoid\Store\Event\StoreBuyEvent;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Mattoid\StoreGiftBox\Model\GiftPackReward;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;
use Mattoid\StoreGiftBox\Service\GiftBoxDrawService;

/**
 * 购买（含管理员赠送）成功后冻结奖池快照
 *
 * 快照是奖池的唯一事实源：进入背包后即使礼包配置被修改，
 * 开启时仍按购买时刻的权重与配置抽奖（需求 5）。
 */
class CreateSnapshotListener
{
    public function handle(StoreBuyEvent $event)
    {
        if ($event->store->code !== 'gift-box') {
            return;
        }

        $pack = GiftPack::query()->find((int) $event->store->subtype);
        if (!$pack) {
            // 礼包已被删除：阻止购买/赠送成立，事务回滚
            throw new \RuntimeException("[gift-box] pack {$event->store->subtype} not found, rollback purchase");
        }

        $rewards = GiftPackReward::query()
            ->where('pack_id', $pack->id)
            ->where('status', 1)
            ->where('weight', '>', 0)
            ->orderBy('sort')
            ->orderBy('id')
            ->get();

        if ($rewards->isEmpty()) {
            throw new \RuntimeException("[gift-box] pack {$pack->id} has no active rewards, rollback purchase");
        }

        $frozen = [];
        foreach ($rewards as $reward) {
            $frozen[] = resolve(GiftBoxDrawService::class)->freezeReward($reward);
        }

        GiftPackSnapshot::query()->create([
            'cart_id' => $event->cart->id,
            'user_id' => $event->user->id,
            'store_id' => $event->store->id,
            'pack_id' => $pack->id,
            'pack_name' => $pack->name,
            'pack_icon' => (string) $pack->icon,
            'pack_open_effect' => (string) $pack->open_effect,
            'pack_overlay_color' => (string) $pack->overlay_color,
            'rewards' => $frozen,
        ]);
    }
}
