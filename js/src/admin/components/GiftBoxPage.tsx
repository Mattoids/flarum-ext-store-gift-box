import app from 'flarum/admin/app';
import Component, { ComponentAttrs } from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import Modal, { IInternalModalAttrs } from 'flarum/common/components/Modal';
import type Mithril from 'mithril';
import Stream from 'flarum/common/utils/Stream';
import Select from 'flarum/common/components/Select';
import extractText from 'flarum/common/utils/extractText';
import GiftPackEditModal from './GiftPackEditModal';

export interface GiftPackData {
  id: number;
  name: string;
  icon: string;
  desc: string;
  status: number;
  sort: number;
  openEffect?: string;
  overlayColor?: string;
  rewards: GiftPackRewardData[];
}

export interface GiftPackRewardData {
  id?: number;
  type: string;
  config: any;
  weight: number;
  status: number;
  sort: number;
  beamColor?: string;
  overlayColor?: string;
  beamEffect?: string;
  effectImage?: string;
}

export interface IGiftBoxPageAttrs extends ComponentAttrs {}

/** 奖励类型的图标与翻译键 */
const REWARD_TYPE_META: Record<string, { icon: string; key: string }> = {
  money: { icon: 'fas fa-coins', key: 'mattoid-store-gift-box.admin.type-money' },
  goods: { icon: 'fas fa-box', key: 'mattoid-store-gift-box.admin.type-goods' },
  group: { icon: 'fas fa-id-card', key: 'mattoid-store-gift-box.admin.type-group' },
  custom: { icon: 'fas fa-star', key: 'mattoid-store-gift-box.admin.type-custom' },
};

export default class GiftBoxPage extends Component<IGiftBoxPageAttrs> {
  private loading: boolean = false;
  private packs: GiftPackData[] = [];

  oninit(vnode: Mithril.Vnode<IGiftBoxPageAttrs, this>) {
    super.oninit(vnode);
    this.load();
  }

  load() {
    this.loading = true;
    app
      .request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/gift-box/packs',
      })
      .then(
        (result: any) => {
          this.packs = (result && result.data) || [];
          this.loading = false;
          m.redraw();
        },
        () => {
          this.loading = false;
          m.redraw();
        }
      );
  }

  view(): Mithril.Children {
    const totalRewards = this.packs.reduce((sum, p) => sum + p.rewards.length, 0);

    return (
      <div className="ExtensionPage GiftBoxAdminPage">
        <div className="ExtensionPage-header">
          <div className="container">
            <div className="GiftBoxPageHeader">
              <div className="GiftBoxPageHeader-text">
                <div className="ExtensionTitle">
                  <h2>
                    <i className="fas fa-gift" /> {app.translator.trans('mattoid-store-gift-box.admin.page-title')}
                  </h2>
                </div>
                <p className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.page-description')}</p>
              </div>
              <div className="GiftBoxPageHeader-actions">
                <Button className="Button Button--primary" icon="fas fa-plus" onclick={() => this.addPack()}>
                  {app.translator.trans('mattoid-store-gift-box.admin.add-pack')}
                </Button>
              </div>
            </div>

            {!this.loading && (
              <div className="GiftBoxStats">
                <span className="GiftBoxStats-item">
                  <i className="fas fa-box-open" /> {app.translator.trans('mattoid-store-gift-box.admin.stat-packs', { count: this.packs.length })}
                </span>
                <span className="GiftBoxStats-item">
                  <i className="fas fa-layer-group" /> {app.translator.trans('mattoid-store-gift-box.admin.stat-rewards', { count: totalRewards })}
                </span>
                <span className="GiftBoxStats-item">
                  <i className="fas fa-check-circle" />{' '}
                  {app.translator.trans('mattoid-store-gift-box.admin.stat-enabled', { count: this.packs.filter((p) => p.status == 1).length })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="container">
          <div className="ExtensionPage-body">
            <div className="ExtensionPage-content">
              {this.loading && <div className="LoadingBlock" />}

              {!this.loading && this.packs.length === 0 && (
                <div className="GiftBoxEmpty">
                  <i className="fas fa-gift" />
                  <p>{app.translator.trans('mattoid-store-gift-box.admin.empty')}</p>
                  <Button className="Button Button--primary" onclick={() => this.addPack()}>
                    {app.translator.trans('mattoid-store-gift-box.admin.add-pack')}
                  </Button>
                </div>
              )}

              <div className="GiftBoxPackGrid">
                {this.packs.map((pack) => this.renderPackCard(pack))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderPackCard(pack: GiftPackData): Mithril.Children {
    const enabledWeight = pack.rewards.filter((r) => r.status == 1 && r.weight > 0).reduce((s, r) => s + r.weight, 0);

    return (
      <div className={`GiftBoxPackCard ${pack.status != 1 ? 'GiftBoxPackCard--off' : ''}`} key={pack.id}>
        <div className="GiftBoxPackCard-icon">
          {pack.icon ? <img src={pack.icon} alt="" /> : <i className="fas fa-gift" />}
        </div>

        <div className="GiftBoxPackCard-main">
          <div className="GiftBoxPackCard-head">
            <span className="GiftBoxPackCard-name">{pack.name}</span>
            {pack.status == 1 ? (
              <span className="GiftBoxPill GiftBoxPill--on">{app.translator.trans('mattoid-store-gift-box.admin.pack-status-on')}</span>
            ) : (
              <span className="GiftBoxPill GiftBoxPill--off">{app.translator.trans('mattoid-store-gift-box.admin.pack-status-off')}</span>
            )}
          </div>

          {pack.desc && <div className="GiftBoxPackCard-desc">{pack.desc}</div>}

          <div className="GiftBoxPackCard-chips">
            {pack.rewards.map((r, i) => {
              const meta = REWARD_TYPE_META[r.type] || REWARD_TYPE_META.custom;
              const pct = enabledWeight > 0 && r.status == 1 ? Math.round((r.weight / enabledWeight) * 100) : null;
              return (
                <span className={`GiftBoxChip ${r.status != 1 ? 'GiftBoxChip--off' : ''}`} key={r.id || i} title={extractText(app.translator.trans(meta.key))}>
                  <i className="fas fa-circle GiftBoxChip-dot" style={`color: ${r.beamColor || '#c98a1b'}`} />
                  <i className={meta.icon} /> {extractText(app.translator.trans(meta.key))}
                  {pct !== null && <em> {pct}%</em>}
                  {r.status != 1 && <i className="fas fa-ban GiftBoxChip-ban" />}
                </span>
              );
            })}
            {pack.rewards.length === 0 && (
              <span className="GiftBoxChip GiftBoxChip--off">
                <i className="fas fa-exclamation-triangle" /> {app.translator.trans('mattoid-store-gift-box.admin.no-rewards')}
              </span>
            )}
          </div>

          <div className="GiftBoxPackCard-meta">
            ID: {pack.id} · {app.translator.trans('mattoid-store-gift-box.admin.rewards')}: {pack.rewards.length} ·{' '}
            {app.translator.trans('mattoid-store-gift-box.admin.pack-sort')}: {pack.sort}
          </div>
        </div>

        <div className="GiftBoxPackCard-actions">
          <Button className="Button Button--icon" icon="fas fa-pen" title={extractText(app.translator.trans('mattoid-store-gift-box.admin.edit-pack'))} onclick={() => this.editPack(pack)} />
          <Button
            className="Button Button--icon Button--danger"
            icon="fas fa-trash-alt"
            title={extractText(app.translator.trans('mattoid-store-gift-box.admin.delete-pack'))}
            onclick={() => this.deletePack(pack)}
          />
          <Switch state={pack.status == 1} onchange={(val: boolean) => this.toggleStatus(pack, val)}>
            {' '}
          </Switch>
        </div>
      </div>
    );
  }

  addPack() {
    app.modal.show(GiftPackEditModal, {
      onSaved: () => this.load(),
    });
  }

  editPack(pack: GiftPackData) {
    app.modal.show(GiftPackEditModal, {
      pack,
      onSaved: () => this.load(),
    });
  }

  toggleStatus(pack: GiftPackData, enabled: boolean) {
    app
      .request({
        method: 'PATCH',
        url: `${app.forum.attribute('apiUrl')}/gift-box/packs/${pack.id}`,
        body: {
          name: pack.name,
          icon: pack.icon,
          desc: pack.desc,
          status: enabled ? 1 : 0,
          sort: pack.sort,
          openEffect: pack.openEffect || '',
          overlayColor: pack.overlayColor || '',
          rewards: pack.rewards.map((r, i) => ({
            type: r.type,
            weight: r.weight,
            status: r.status,
            sort: r.sort || i,
            beamColor: r.beamColor || '',
            overlayColor: r.overlayColor || '',
            beamEffect: r.beamEffect || 'beam',
            effectImage: r.effectImage || '',
            config: r.config,
          })),
        },
      })
      .then(() => this.load());
  }

  deletePack(pack: GiftPackData) {
    if (!confirm(extractText(app.translator.trans('mattoid-store-gift-box.admin.delete-pack-confirm')))) {
      return;
    }
    app
      .request({
        method: 'DELETE',
        url: `${app.forum.attribute('apiUrl')}/gift-box/packs/${pack.id}`,
      })
      .then(() => this.load());
  }
}
