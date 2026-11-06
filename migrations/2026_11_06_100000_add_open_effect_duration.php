<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        // 开启特效自定义时长（秒，0 = 自动跟随 GIF/视频实际时长）
        $schema->table('store_gift_pack', function (Blueprint $table) {
            $table->unsignedSmallInteger('open_effect_duration')->default(0)->comment('开启特效时长（秒，0 为自动）');
        });

        // 快照冻结特效时长
        $schema->table('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->unsignedSmallInteger('pack_open_effect_duration')->default(0)->comment('冻结时的开启特效时长（秒，0 为自动）');
        });
    },
];
