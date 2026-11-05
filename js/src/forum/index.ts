import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import { extend } from 'flarum/common/extend';
import UserPage from 'flarum/forum/components/UserPage';
import LinkButton from 'flarum/common/components/LinkButton';
import ItemList from 'flarum/common/utils/ItemList';
import GiftBoxUseModal from './components/GiftBoxUseModal';
import GiftBoxBackpackItem from './components/GiftBoxBackpackItem';
import DrawsPage from './components/DrawsPage';

export { key } from '../common';

app.initializers.add('mattoid-store-gift-box', () => {
  // 背包开启礼包的结果弹窗：礼盒跳动 → 开盖 → 奖励闪光特效
  (app as any).storeRegistry?.backpackUseModal?.register('gift-box', GiftBoxUseModal);
  // 背包中的礼包卡片：预载开启特效（GIF），点击直接开启
  (app as any).storeRegistry?.backpackItem?.register('gift-box', GiftBoxBackpackItem);

  // 开启记录页（用户主页导航入口）
  app.routes.giftBoxDraws = {
    path: '/u/:username/gift-box-draws',
    component: DrawsPage,
  };

  extend(UserPage.prototype, 'navItems', function (this: UserPage, items: ItemList<Mithril.Children>) {
    const user = this.user;
    if (!app.session?.user || !user || user.id() !== app.session.user.id()) {
      return;
    }

    items.add(
      'giftBoxDraws',
      LinkButton.component(
        {
          href: app.route('giftBoxDraws', { username: user.slug() }),
          icon: 'fas fa-gift',
        },
        app.translator.trans('mattoid-store-gift-box.forum.draws-title')
      ),
      8
    );
  });
});
