<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        $schema->table('store_gift_pack_reward', function (Blueprint $table) {
            // 开奖光效类型：beam-顶部光束 burst-爆发 glow ring-扩散光环 none-关闭
            $table->string('beam_effect', 20)->default('beam')->comment('开奖光效类型');
            // 自定义开奖效果图片（替代奖励球展示，空 = 默认图标球）
            $table->string('effect_image')->default('')->comment('开奖效果图片');
        });
    },
];
