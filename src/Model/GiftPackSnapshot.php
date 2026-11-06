<?php

namespace Mattoid\StoreGiftBox\Model;

use Flarum\Database\AbstractModel;

class GiftPackSnapshot extends AbstractModel
{
    protected $table = 'store_gift_pack_snapshot';

    protected $fillable = [
        'cart_id', 'user_id', 'store_id', 'pack_id',
        'pack_name', 'pack_icon', 'pack_open_effect', 'pack_open_effect_duration', 'pack_overlay_color', 'rewards', 'drawn_reward', 'drawn_at',
    ];

    protected $casts = [
        'rewards' => 'array',
        'drawn_reward' => 'array',
    ];

    protected $dates = ['drawn_at'];

    public $timestamps = true;
}
