<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        // 礼包开启特效（GIF 图片地址，空 = 使用内置 CSS 动画）
        $schema->table('store_gift_pack', function (Blueprint $table) {
            $table->string('open_effect')->default('')->comment('开启特效 GIF 地址');
        });

        // 快照冻结开启特效：已购礼包不随后台修改变化
        $schema->table('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->string('pack_open_effect')->default('')->comment('冻结时的开启特效地址');
        });
    },
];
