<?php

namespace Mattoid\StoreGiftBox\Model;

use Flarum\Database\AbstractModel;

class GiftPackReward extends AbstractModel
{
    protected $table = 'store_gift_pack_reward';

    protected $fillable = ['pack_id', 'type', 'config', 'weight', 'status', 'sort', 'beam_color', 'beam_effect', 'effect_image', 'overlay_color'];

    protected $casts = [
        'config' => 'array',
    ];

    public $timestamps = true;
}
