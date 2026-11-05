<?php

namespace Mattoid\StoreGiftBox\Event;

use Flarum\User\User;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;

/**
 * 自定义奖励发放事件：其他扩展监听此事件自行处理发奖。
 * payload 为只读契约，结构变更需视为 BC 破坏。
 */
class GiftBoxDrawEvent
{
    /** @var User */
    public $user;

    /** @var array 抽中的奖励（冻结快照中的条目） */
    public $reward;

    /** @var GiftPackSnapshot */
    public $snapshot;

    public function __construct(User $user, array $reward, GiftPackSnapshot $snapshot)
    {
        $this->user = $user;
        $this->reward = $reward;
        $this->snapshot = $snapshot;
    }
}
