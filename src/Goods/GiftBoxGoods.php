<?php

namespace Mattoid\StoreGiftBox\Goods;

use Mattoid\Store\Goods\Goods;
use Mattoid\StoreGiftBox\Model\GiftPack;

/**
 * 幸运礼包商品信息
 *
 * 每个礼包配置 = 一个商店商品：通过 store.subtype = 礼包 ID 区分。
 * itemTypes 动态加载启用中的礼包，使管理端「添加商品」的 subtype
 * 下拉直接列出具体礼包（添加时显示具体礼包）。
 */
class GiftBoxGoods extends Goods
{
    public $name = 'mattoid-store-gift-box.forum.goods-name';

    public $popUp = [];

    public $itemTypes = [];

    public $group = 'mattoid-store-gift-box.forum.group-name';

    public $icon = '/assets/extensions/mattoid-store-gift-box/logo.svg';

    public $className = 'store-buy Modal--small';

    /** 礼包开启属一次性消耗，默认允许进背包 */
    public $usable = true;

    public function __construct()
    {
        try {
            $this->itemTypes = GiftPack::query()
                ->where('status', 1)
                ->orderBy('sort')
                ->orderBy('id')
                ->get()
                ->map(function (GiftPack $pack) {
                    return ['key' => (string) $pack->id, 'name' => $pack->name];
                })
                ->all();
        } catch (\Throwable $e) {
            // 迁移未执行等场景下降级为空列表，不影响其他商品插件
            $this->itemTypes = [];
        }
    }
}
