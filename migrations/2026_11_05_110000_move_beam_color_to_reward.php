<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        // 光束颜色按奖池奖励项配置（抽中哪个道具显示哪个颜色）
        $schema->table('store_gift_pack_reward', function (Blueprint $table) {
            $table->string('beam_color', 7)->default('')->comment('开启光束颜色（#RRGGBB，空为默认）');
        });

        // 移除礼包级/快照级的光束颜色（改为奖励级）
        $schema->table('store_gift_pack', function (Blueprint $table) {
            $table->dropColumn('beam_color');
        });
        $schema->table('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->dropColumn('pack_beam_color');
        });
    },
];
