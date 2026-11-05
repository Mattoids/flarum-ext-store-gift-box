<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        // 礼包默认遮罩层颜色（奖励未设置时使用，空 = 论坛默认遮罩）
        $schema->table('store_gift_pack', function (Blueprint $table) {
            $table->string('overlay_color', 7)->default('')->comment('遮罩层颜色（#RRGGBB，空为默认）');
        });

        // 奖励级遮罩层颜色（覆盖礼包默认）
        $schema->table('store_gift_pack_reward', function (Blueprint $table) {
            $table->string('overlay_color', 7)->default('')->comment('遮罩层颜色（#RRGGBB，空用礼包默认）');
        });

        // 快照冻结礼包默认遮罩色
        $schema->table('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->string('pack_overlay_color', 7)->default('')->comment('冻结时的礼包默认遮罩色');
        });
    },
];
