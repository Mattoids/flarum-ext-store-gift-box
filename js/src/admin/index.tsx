import app from 'flarum/admin/app';
import GiftBoxPage from './components/GiftBoxPage';
import GiftBoxGoodsForm from './components/GiftBoxGoodsForm';

app.initializers.add('mattoid-store-gift-box', () => {
  app.extensionData.for('mattoid-store-gift-box').registerPage(GiftBoxPage);

  // 商店「添加商品」表单扩展：设置礼包商品默认值并提示
  (app as any).storeAdminRegistry?.goodsForm?.register('gift-box', GiftBoxGoodsForm);
});
