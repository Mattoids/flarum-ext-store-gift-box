<?php

namespace Mattoid\StoreGiftBox\Goods;

use Flarum\Foundation\ValidationException;
use Flarum\User\User;
use Mattoid\Store\Goods\Validate;
use Mattoid\Store\Model\StoreModel;
use Mattoid\StoreGiftBox\Model\GiftPack;
use Mattoid\StoreGiftBox\Model\GiftPackReward;

class GiftBoxValidate extends Validate
{
    public static function validate(User $user, StoreModel $store, $params)
    {
        $pack = GiftPack::query()->find((int) $store->subtype);
        if (!$pack || $pack->status != 1) {
            throw new ValidationException(['message' => static::trans('pack-unavailable')]);
        }

        $hasReward = GiftPackReward::query()
            ->where('pack_id', $pack->id)
            ->where('status', 1)
            ->where('weight', '>', 0)
            ->exists();
        if (!$hasReward) {
            throw new ValidationException(['message' => static::trans('pack-empty')]);
        }

        return true;
    }

    protected static function trans(string $key): string
    {
        return resolve('translator')->trans("mattoid-store-gift-box.forum.error.{$key}");
    }
}
