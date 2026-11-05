<?php

namespace Mattoid\StoreGiftBox\Controller;

use Flarum\Api\Controller\AbstractListController;
use Flarum\Http\RequestUtil;
use Flarum\Http\UrlGenerator;
use Flarum\User\Exception\PermissionDeniedException;
use Mattoid\StoreGiftBox\Model\GiftPackSnapshot;
use Mattoid\StoreGiftBox\Serializer\GiftBoxDrawSerializer;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

/**
 * 我的礼包开启记录（当前登录用户，分页）
 */
class ListDrawsController extends AbstractListController
{
    public $serializer = GiftBoxDrawSerializer::class;

    const MAX_LIMIT = 50;

    protected $url;

    public function __construct(UrlGenerator $url)
    {
        $this->url = $url;
    }

    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);
        if ($actor->isGuest()) {
            throw new PermissionDeniedException();
        }

        $params = $request->getQueryParams();
        $limit = min($this->extractLimit($request), self::MAX_LIMIT);
        $offset = $this->extractOffset($request);

        $query = GiftPackSnapshot::query()
            ->where('user_id', $actor->id)
            ->whereNotNull('drawn_at')
            ->orderByDesc('id');

        $total = $query->count();
        $draws = $query->skip($offset)->take($limit)->get();

        $document->addPaginationLinks(
            $this->url->to('api')->route('gift-box.draws.list'),
            $params,
            $offset,
            $limit,
            $offset + $limit < $total ? null : 0
        );

        return $draws;
    }
}
