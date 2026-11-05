<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        // 礼包开启光束颜色（管理端自定义，留空 = 默认金色）
        $schema->table('store_gift_pack', function (Blueprint $table) {
            $table->string('beam_color', 7)->default('')->comment('开启光束颜色（#RRGGBB，空为默认）');
        });

        // 快照冻结光束颜色：已购礼包不随后台修改变化
        $schema->table('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->string('pack_beam_color', 7)->default('')->comment('冻结时的光束颜色');
        });
    },
];
