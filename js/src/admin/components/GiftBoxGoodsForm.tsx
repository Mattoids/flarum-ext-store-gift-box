import app from 'flarum/admin/app';
import Component, { ComponentAttrs } from 'flarum/common/Component';
import type Mithril from 'mithril';

interface IGiftBoxGoodsFormAttrs extends ComponentAttrs {
  /** 弹窗的 Stream 参数 */
  params: any;
  /** 编辑时的商品数据（新增时为空） */
  storeData?: any;
}

/**
 * 商店「添加/编辑商品」表单的礼包扩展区：
 * 新增时默认「允许使用 + 一次性道具」，并在选定礼包后自动带出礼包名称。
 */
export default class GiftBoxGoodsForm extends Component<IGiftBoxGoodsFormAttrs> {
  private packNames: Record<string, string> = {};
  private packsLoaded: boolean = false;

  oninit(vnode: Mithril.Vnode<IGiftBoxGoodsFormAttrs, this>) {
    super.oninit(vnode);

    if (!this.attrs.storeData) {
      this.attrs.params.usable(1);
      this.attrs.params.useType('consumable');
    }

    this.loadPacks();
  }

  loadPacks() {
    app
      .request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/gift-box/packs',
      })
      .then((result: any) => {
        const packs = (result && result.data) || [];
        packs.forEach((p: any) => {
          this.packNames[String(p.id)] = p.name;
        });
        this.packsLoaded = true;
        this.syncTitle();
        m.redraw();
      })
      .catch(() => {
        this.packsLoaded = true;
      });
  }

  /**
   * 新增商品且标题为空时，按选中的礼包自动填充商品名称
   */
  syncTitle() {
    if (this.attrs.storeData) return;
    const subtype = this.attrs.params.subtype ? this.attrs.params.subtype() : '';
    if (!subtype) return;
    const packName = this.packNames[String(subtype)];
    if (packName && !this.attrs.params.title()) {
      this.attrs.params.title(packName);
    }
  }

  view(): Mithril.Children {
    this.syncTitle();

    const subtype = this.attrs.params.subtype ? this.attrs.params.subtype() : '';
    const packName = subtype ? this.packNames[String(subtype)] : null;

    return (
      <div className="GiftBoxGoodsForm">
        <div className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.goods-form-tip')}</div>
        {this.packsLoaded && subtype && (
          <p style="margin-top:8px">
            <strong>{app.translator.trans('mattoid-store-gift-box.admin.store-list-pack')}:</strong> {packName || `#${subtype}`}
          </p>
        )}
        {!subtype && (
          <p className="helpText" style="margin-top:8px;color: #d00000;">
            <i className="fas fa-exclamation-triangle" /> {app.translator.trans('mattoid-store-gift-box.admin.goods-form-no-pack')}
          </p>
        )}
      </div>
    );
  }
}
