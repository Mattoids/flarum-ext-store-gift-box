<?php
// Flarum 1.x 不支持 rollback，本迁移不可回滚。

use Illuminate\Database\Schema\Blueprint;

use Flarum\Database\Migration;

return [
    'up' => function (Illuminate\Database\Schema\Builder $schema) {
        $schema->create('store_gift_pack', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->comment('礼包名称');
            $table->string('icon')->default('')->comment('礼包图标');
            $table->text('desc')->nullable()->comment('礼包描述');
            $table->integer('status')->default(1)->comment('状态 0-停用 1-启用');
            $table->integer('sort')->default(0)->comment('排序');
            $table->timestamps();
        });

        $schema->create('store_gift_pack_reward', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('pack_id')->comment('礼包ID')->index();
            $table->string('type')->comment('奖励类型 money-金钱 goods-商店商品 group-用户组 custom-自定义');
            $table->text('config')->comment('奖励配置（JSON）');
            $table->integer('weight')->default(1)->comment('抽中权重');
            $table->integer('status')->default(1)->comment('状态 0-停用 1-启用');
            $table->integer('sort')->default(0)->comment('排序');
            $table->timestamps();
        });

        $schema->create('store_gift_pack_snapshot', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('cart_id')->comment('商店购买记录ID')->unique();
            $table->integer('user_id')->comment('用户ID')->index();
            $table->integer('store_id')->comment('商店商品ID')->index();
            $table->integer('pack_id')->comment('礼包ID');
            $table->string('pack_name')->comment('冻结时的礼包名称');
            $table->string('pack_icon')->default('')->comment('冻结时的礼包图标');
            $table->text('rewards')->comment('冻结的奖池（JSON，不受后续配置修改影响）');
            $table->text('drawn_reward')->nullable()->comment('抽中的奖励（JSON）');
            $table->dateTime('drawn_at')->nullable()->comment('开启时间');
            $table->timestamps();
        });
    },
];
