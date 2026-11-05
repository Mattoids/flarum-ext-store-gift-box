import app from 'flarum/forum/app';
import Component, { ComponentAttrs } from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Alert from 'flarum/common/components/Alert';
import type Mithril from 'mithril';
import GiftBoxUseModal from './GiftBoxUseModal';

interface IGiftBoxBackpackItemAttrs extends ComponentAttrs {
  item: any;
  onChanged?: () => void;
}

/**
 * 礼包的背包卡片：
 * 与默认背包卡片一致的交互，但会在初始化时预载礼包的开启特效（GIF），
 * 开启弹窗直接以 GIF 开场，避免出现内置默认动画的闪帧。
 */
export default class GiftBoxBackpackItem extends Component<IGiftBoxBackpackItemAttrs> {
  private loading: boolean = false;
  private effectUrl: string = '';

  oninit(vnode: Mithril.Vnode<IGiftBoxBackpackItemAttrs, this>) {
    super.oninit(vnode);
    this.loadPackInfo();
  }

  loadPackInfo() {
    const subtype = this.item().subtype;
    if (!subtype) return;
    app
      .request({
        method: 'GET',
        url: `${app.forum.attribute('apiUrl')}/gift-box/pack-info?id=${subtype}`,
      })
      .then((result: any) => {
        const data = result && result.data;
        if (data && data.openEffect) {
          this.effectUrl = data.openEffect;
          // 预加载图片，开启时即刻播放
          const img = new Image();
          img.src = this.effectUrl;
        }
      })
      .catch(() => {});
  }

  item(): any {
    return this.attrs.item || {};
  }

  view(): Mithril.Children {
    const item = this.item();

    return (
      <div className="BackpackItem">
        <div className="BackpackItem-titleRow">
          <div className="itemTitle" title={item.title}>
            {item.title}
          </div>
          <span className="StoreItem-type BackpackItem-typeBadge">
            {app.translator.trans('mattoid-store.lib.item-use-type-consumable')}
          </span>
        </div>
        <div className="StoreItem-icon">
          {item.icon ? <img src={item.icon} alt={item.title || ''} /> : <i className="fas fa-gift" />}
        </div>
        <div className="BackpackItem-info">
          <span>
            {app.translator.trans('mattoid-store.lib.backpack-remaining', { count: item.remaining })}
          </span>
        </div>
        <div className="BackpackItem-actionsRow">
          <div className="BackpackItem-actions">
            <Button
              className={'Button Button--primary BackpackItem-fullBtn'}
              disabled={this.loading}
              loading={this.loading}
              onclick={() => this.open()}
            >
              {app.translator.trans('mattoid-store-gift-box.forum.use-open')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  open() {
    this.loading = true;
    m.redraw();

    app
      .request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/store/backpack/use',
        body: { id: this.item().refId },
      })
      .then(
        () => {
          this.loading = false;
          app.modal.show(GiftBoxUseModal, { item: this.attrs.item, effectUrl: this.effectUrl });
          if (this.attrs.onChanged) this.attrs.onChanged();
        },
        (error: any) => {
          this.loading = false;
          this.showError(error);
        }
      );
  }

  showError(error: any) {
    const detail =
      error && error.response && error.response.responseJSON && error.response.responseJSON.errors && error.response.responseJSON.errors[0]
        ? error.response.responseJSON.errors[0].detail
        : null;
    app.alerts.show(Alert, { type: 'error' }, detail || app.translator.trans('mattoid-store.lib.backpack-use-fail'));
    m.redraw();
  }
}
