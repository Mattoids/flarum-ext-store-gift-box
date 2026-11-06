<?php

namespace Mattoid\StoreGiftBox\Model;

use Flarum\Database\AbstractModel;

class GiftPack extends AbstractModel
{
    protected $table = 'store_gift_pack';

    protected $fillable = ['name', 'icon', 'desc', 'status', 'sort', 'open_effect', 'open_effect_duration', 'overlay_color'];

    public $timestamps = true;

    public function rewards()
    {
        return $this->hasMany(GiftPackReward::class, 'pack_id');
    }
}
