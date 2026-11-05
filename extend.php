<?php

use Flarum\Extend;
use Mattoid\Store\Extend\StoreExtend;
use Mattoid\Store\Event\StoreBuyEvent;
use Mattoid\StoreGiftBox\Controller\DeleteGiftPackController;
use Mattoid\StoreGiftBox\Controller\DrawnResultController;
use Mattoid\StoreGiftBox\Controller\ListDrawsController;
use Mattoid\StoreGiftBox\Controller\ListGiftPackController;
use Mattoid\StoreGiftBox\Controller\PackInfoController;
use Mattoid\StoreGiftBox\Controller\SaveGiftPackController;
use Mattoid\StoreGiftBox\Controller\UpdateGiftPackController;
use Mattoid\StoreGiftBox\Controller\UploadEffectController;
use Mattoid\StoreGiftBox\Goods\GiftBoxGoods;
use Mattoid\StoreGiftBox\Goods\GiftBoxUse;
use Mattoid\StoreGiftBox\Goods\GiftBoxValidate;
use Mattoid\StoreGiftBox\Listener\CreateSnapshotListener;

return [
    (new Extend\Frontend('forum'))->js(__DIR__.'/js/dist/forum.js')->css(__DIR__.'/less/forum.less'),

    (new Extend\Filesystem())
        ->disk('mattoid-gift-box', function (\Flarum\Foundation\Paths $paths, \Flarum\Http\UrlGenerator $url) {
            return [
                'root' => "$paths->public/assets/mattoid/giftBox",
                'url' => $url->to('forum')->path('assets/mattoid/giftBox'),
            ];
        }),
    (new Extend\Frontend('admin'))->js(__DIR__.'/js/dist/admin.js')->css(__DIR__.'/less/admin.less'),

    (new Extend\Locales(__DIR__.'/locale')),

    (new Extend\Routes('api'))
        ->get('/gift-box/packs', 'gift-box.packs.list', ListGiftPackController::class)
        ->post('/gift-box/packs', 'gift-box.packs.create', SaveGiftPackController::class)
        ->patch('/gift-box/packs/{id}', 'gift-box.packs.update', UpdateGiftPackController::class)
        ->delete('/gift-box/packs/{id}', 'gift-box.packs.delete', DeleteGiftPackController::class)
        ->get('/gift-box/drawn/{cartId}', 'gift-box.drawn', DrawnResultController::class)
        ->get('/gift-box/draws', 'gift-box.draws.list', ListDrawsController::class)
        ->post('/gift-box/upload', 'gift-box.upload', UploadEffectController::class)
        ->get('/gift-box/pack-info', 'gift-box.pack.info', PackInfoController::class),

    // 商品 code 为 gift-box，每个礼包通过 store.subtype = 礼包 ID 区分
    (new StoreExtend('gift-box'))
        ->addStoreGoods(GiftBoxGoods::class)
        ->addValidate(GiftBoxValidate::class)
        ->addUse(GiftBoxUse::class),

    // 购买（含管理员赠送）成功后冻结奖池快照
    (new Extend\Event())->listen(StoreBuyEvent::class, CreateSnapshotListener::class),
];
