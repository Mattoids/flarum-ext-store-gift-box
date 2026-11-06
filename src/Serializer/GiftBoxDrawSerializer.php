<?php

namespace Mattoid\StoreGiftBox\Serializer;

use Flarum\Api\Serializer\AbstractSerializer;

/**
 * 礼包开启记录序列化器
 */
class GiftBoxDrawSerializer extends AbstractSerializer
{
    protected function getDefaultAttributes($data)
    {
        $drawn = $data->drawn_reward;
        if (!is_array($drawn)) {
            $drawn = json_decode((string) $drawn, true) ?: null;
        }

        return [
            'id' => $data->id,
            'packName' => $data->pack_name,
            'packIcon' => $data->pack_icon,
            'beamColor' => (string) (($drawn['config']['beamColor'] ?? '')),
            'openEffect' => (string) $data->pack_open_effect,
            'openEffectDuration' => (int) $data->pack_open_effect_duration,
            'overlayColor' => (string) (($drawn['config']['overlayColor'] ?? '') ?: $data->pack_overlay_color),
            'drawn' => $drawn,
            'drawnAt' => $data->drawn_at ? $this->formatDate($data->drawn_at) : null,
        ];
    }
}
