import app from 'flarum/admin/app';
import Modal, { IInternalModalAttrs } from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import Select from 'flarum/common/components/Select';
import extractText from 'flarum/common/utils/extractText';
import type Mithril from 'mithril';
import Stream from 'flarum/common/utils/Stream';
import { GiftPackData, GiftPackRewardData } from './GiftBoxPage';
import { isVideoEffect } from '../../common/utils/effectMedia';

export interface IGiftPackEditModalAttrs extends IInternalModalAttrs {
  pack?: GiftPackData;
  onSaved?: () => void;
}

interface RewardRow {
  type: Stream<string>;
  weight: Stream<number>;
  status: Stream<number>;
  sort: Stream<number>;
  beamColor: Stream<string>;
  overlayColor: Stream<string>;
  beamEffect: Stream<string>;
  effectImage: Stream<string>;
  amount: Stream<number>;
  storeId: Stream<number>;
  groupIds: Stream<number[]>;
  customLabel: Stream<string>;
  customPayload: Stream<string>;
}

export default class GiftPackEditModal extends Modal<IGiftPackEditModalAttrs> {
  private id?: number;
  private name: Stream<string> = Stream('');
  private icon: Stream<string> = Stream('');
  private desc: Stream<string> = Stream('');
  private status: Stream<number> = Stream(1);
  private sort: Stream<number> = Stream(0);
  private openEffect: Stream<string> = Stream('');
  private openEffectDuration: Stream<number> = Stream(0);
  private overlayColor: Stream<string> = Stream('');
  private uploadingEffect: boolean = false;
  private rewards: RewardRow[] = [];
  private storeOptions: Record<number, string> | null = null;
  private groupOptions: Record<number, string> = {};
  /** 各奖励行的光效预览开关 */
  private previewRows: Record<number, boolean> = {};

  oninit(vnode: Mithril.Vnode<IGiftPackEditModalAttrs, this>) {
    super.oninit(vnode);

    const pack = this.attrs.pack;
    if (pack) {
      this.id = pack.id;
      this.name = Stream(pack.name);
      this.icon = Stream(pack.icon || '');
      this.desc = Stream(pack.desc || '');
      this.status = Stream(pack.status);
      this.sort = Stream(pack.sort);
      this.openEffect = Stream(pack.openEffect || '');
      this.openEffectDuration = Stream(pack.openEffectDuration || 0);
      this.overlayColor = Stream(pack.overlayColor || '');
      this.rewards = pack.rewards.map((r) => this.rowFromData(r));
    } else {
      this.addReward('money');
    }

    this.loadStoreOptions();
    this.loadGroupOptions();
  }

  rowFromData(r: GiftPackRewardData): RewardRow {
    const cfg = r.config || {};
    return {
      type: Stream(r.type),
      weight: Stream(r.weight),
      status: Stream(r.status),
      sort: Stream(r.sort),
      beamColor: Stream(r.beamColor || ''),
      overlayColor: Stream(r.overlayColor || ''),
      beamEffect: Stream(r.beamEffect || 'beam'),
      effectImage: Stream(r.effectImage || ''),
      amount: Stream(cfg.amount || 0),
      storeId: Stream(cfg.storeId || 0),
      groupIds: Stream(cfg.groupIds || []),
      customLabel: Stream(cfg.label || ''),
      customPayload: Stream(cfg.payload ? JSON.stringify(cfg.payload) : ''),
    };
  }

  addReward(type: string) {
    this.rewards.push({
      type: Stream(type),
      weight: Stream(1),
      status: Stream(1),
      sort: Stream(this.rewards.length),
      beamColor: Stream(''),
      // 默认继承礼包遮罩层颜色，用户可再手动改成不同效果
      overlayColor: Stream(this.overlayColor() || ''),
      beamEffect: Stream('beam'),
      effectImage: Stream(''),
      amount: Stream(0),
      storeId: Stream(0),
      groupIds: Stream([]),
      customLabel: Stream(''),
      customPayload: Stream(''),
    });
  }

  loadStoreOptions() {
    app.store
      .find('/store/list', { filter: {} })
      .then((results: any) => {
        const payload = results.payload || {};
        const items: any[] = payload.data || [];
        const map: Record<number, string> = {};
        items.forEach((item: any) => {
          const a = item.attributes || {};
          map[a.id] = a.title || `#${a.id}`;
        });
        this.storeOptions = map;
        m.redraw();
      })
      .catch(() => {
        this.storeOptions = {};
      });
  }

  loadGroupOptions() {
    app.store
      .find('groups')
      .then((groups: any) => {
        groups.forEach((g: any) => {
          this.groupOptions[g.id()] = g.nameSingular() || g.namePlural() || `#${g.id()}`;
        });
        m.redraw();
      })
      .catch(() => {});
  }

  title(): Mithril.Children {
    return app.translator.trans(this.id ? 'mattoid-store-gift-box.admin.edit-pack' : 'mattoid-store-gift-box.admin.add-pack');
  }

  className(): string {
    return 'Modal--large GiftBoxEditModal';
  }

  content(): Mithril.Children {
    return (
      <div className="Modal-body">
        <div className="Form">
          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.pack-name')}</label>
            <input required className="FormControl" type="text" bidi={this.name} placeholder={app.translator.trans('mattoid-store-gift-box.admin.pack-name-placeholder')} />
          </div>

          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.pack-icon')}</label>
            <div className="input-group">
              <input className="FormControl" type="text" bidi={this.icon} />
              <Button className="Button" onclick={(e: Event) => this.uploadIcon(e)}>
                {app.translator.trans('mattoid-store-gift-box.admin.pack-icon-upload')}
              </Button>
            </div>
          </div>

          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.pack-desc')}</label>
            <textarea className="FormControl" rows={2} bidi={this.desc}></textarea>
          </div>

          <div className="Form-group StoreAdminGrid StoreAdminGrid--4col">
            <div>
              <label>{app.translator.trans('mattoid-store-gift-box.admin.pack-status')}</label>
              <Switch state={this.status() == 1} onchange={(v: boolean) => (this.status = Stream(v ? 1 : 0))}>
                {' '}
              </Switch>
            </div>
            <div>
              <label>{app.translator.trans('mattoid-store-gift-box.admin.pack-sort')}</label>
              <input className="FormControl" type="number" step="1" bidi={this.sort} />
            </div>
          </div>

          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.open-effect')}</label>
            <div className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.open-effect-help')}</div>
            <div className="GiftBoxEffectRow">
              {this.openEffect() && (
                <span className="GiftBoxEffectPreview">
                  {isVideoEffect(this.openEffect()) ? (
                    <video src={this.openEffect()} autoPlay muted playsInline loop />
                  ) : (
                    <img src={this.openEffect()} alt="" />
                  )}
                </span>
              )}
              <input className="FormControl" type="text" bidi={this.openEffect} placeholder="/assets/..." />
              <Button className="Button" loading={this.uploadingEffect} onclick={(e: Event) => this.uploadEffect(e)}>
                {app.translator.trans('mattoid-store-gift-box.admin.open-effect-upload')}
              </Button>
              {this.openEffect() && (
                <Button className="Button Button--danger" onclick={() => this.openEffect('')}>
                  {app.translator.trans('mattoid-store-gift-box.admin.open-effect-clear')}
                </Button>
              )}
            </div>
            <div className="GiftBoxEffectDuration">
              <label>{app.translator.trans('mattoid-store-gift-box.admin.open-effect-duration')}</label>
              <input
                className="FormControl"
                type="number"
                min="0"
                max="600"
                step="1"
                bidi={this.openEffectDuration}
                disabled={!this.openEffect()}
              />
              <span className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.open-effect-duration-help')}</span>
            </div>
          </div>

          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.overlay-color')}</label>
            <div className="GiftBoxColorRow">
              <input
                type="color"
                className="GiftBoxColorPicker"
                value={this.overlayColor() || '#1b2432'}
                onchange={(e: Event) => {
                  this.overlayColor((e.target as HTMLInputElement).value);
                }}
              />
              <input
                className="FormControl"
                type="text"
                placeholder={extractText(app.translator.trans('mattoid-store-gift-box.admin.overlay-color-default'))}
                bidi={this.overlayColor}
              />
              {this.overlayColor() && (
                <Button className="Button" onclick={() => this.overlayColor('')}>
                  {app.translator.trans('mattoid-store-gift-box.admin.open-effect-clear')}
                </Button>
              )}
            </div>
            <div className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.overlay-color-help')}</div>
          </div>

          <div className="Form-group">
            <label>{app.translator.trans('mattoid-store-gift-box.admin.rewards')}</label>
            <div className="helpText">{app.translator.trans('mattoid-store-gift-box.admin.rewards-tip')}</div>
            {this.rewards.length > 0 && (
              <div className="GiftBoxRewardHead">
                <span>{app.translator.trans('mattoid-store-gift-box.admin.reward-type')}</span>
                <span>{app.translator.trans('mattoid-store-gift-box.admin.beam-color')}</span>
                <span>{app.translator.trans('mattoid-store-gift-box.admin.reward-weight')}</span>
                <span>{app.translator.trans('mattoid-store-gift-box.admin.reward-status')}</span>
                <span />
                <span className="GiftBoxRewardHead-config">{app.translator.trans('mattoid-store-gift-box.admin.reward-config')}</span>
              </div>
            )}
            {this.rewards.map((row, i) => this.renderRewardRow(row, i))}
            <Button className="Button GiftBoxRewardAdd" icon="fas fa-plus" onclick={() => this.addReward('money')}>
              {app.translator.trans('mattoid-store-gift-box.admin.add-reward')}
            </Button>
          </div>

          <div className="Form-group">
            {Button.component(
              {
                className: 'Button Button--primary',
                type: 'submit',
                loading: this.loading,
              },
              app.translator.trans('mattoid-store-gift-box.admin.edit-pack')
            )}
          </div>
        </div>
      </div>
    );
  }

  renderRewardRow(row: RewardRow, index: number): Mithril.Children {
    return (
      <div className="GiftBoxRewardRow" key={index}>
        <div className="GiftBoxRewardRow-top">
          <div>
            {Select.component({
              options: {
                money: app.translator.trans('mattoid-store-gift-box.admin.type-money'),
                goods: app.translator.trans('mattoid-store-gift-box.admin.type-goods'),
                group: app.translator.trans('mattoid-store-gift-box.admin.type-group'),
                custom: app.translator.trans('mattoid-store-gift-box.admin.type-custom'),
              },
              value: row.type(),
              onchange: (v: string) => (row.type = Stream(v)),
            })}
          </div>
          <div className="GiftBoxRewardRow-color">
            <input
              type="color"
              className="GiftBoxColorPicker"
              title={extractText(app.translator.trans('mattoid-store-gift-box.admin.beam-color'))}
              value={row.beamColor() || '#ffd76e'}
              onchange={(e: Event) => {
                row.beamColor((e.target as HTMLInputElement).value);
              }}
            />
            <input
              type="color"
              className="GiftBoxColorPicker GiftBoxColorPicker--overlay"
              title={extractText(app.translator.trans('mattoid-store-gift-box.admin.overlay-color'))}
              value={row.overlayColor() || '#666666'}
              onchange={(e: Event) => {
                row.overlayColor((e.target as HTMLInputElement).value);
              }}
            />
            {row.overlayColor() && (
              <Button
                className="Button Button--icon GiftBoxColorClear"
                icon="fas fa-undo"
                title={extractText(app.translator.trans('mattoid-store-gift-box.admin.overlay-color-inherit'))}
                onclick={() => row.overlayColor('')}
              />
            )}
            {Select.component({
              options: {
                beam: app.translator.trans('mattoid-store-gift-box.admin.fx-beam'),
                burst: app.translator.trans('mattoid-store-gift-box.admin.fx-burst'),
                ring: app.translator.trans('mattoid-store-gift-box.admin.fx-ring'),
                rays: app.translator.trans('mattoid-store-gift-box.admin.fx-rays'),
                rain: app.translator.trans('mattoid-store-gift-box.admin.fx-rain'),
                glow: app.translator.trans('mattoid-store-gift-box.admin.fx-glow'),
                none: app.translator.trans('mattoid-store-gift-box.admin.fx-none'),
              },
              value: row.beamEffect(),
              onchange: (v: string) => (row.beamEffect = Stream(v)),
            })}
          </div>
          <div>
            <input className="FormControl" type="number" min="1" step="1" bidi={row.weight} title={extractText(app.translator.trans('mattoid-store-gift-box.admin.reward-weight'))} />
          </div>
          <div>
            <Switch state={row.status() == 1} onchange={(v: boolean) => (row.status = Stream(v ? 1 : 0))}>
              {' '}
            </Switch>
          </div>
          <div>
            <Button className="Button Button--danger Button--icon" icon="fas fa-times" onclick={() => this.rewards.splice(index, 1)} />
          </div>
        </div>

        <div className="GiftBoxRewardRow-config">
          {row.type() === 'money' && (
            <input
              className="FormControl"
              type="number"
              min="0"
              step="0.01"
              bidi={row.amount}
              placeholder={app.translator.trans('mattoid-store-gift-box.admin.reward-money-amount')}
            />
          )}
          {row.type() === 'goods' && this.renderStoreSelect(row)}
          {row.type() === 'group' && this.renderGroupSelect(row)}
          {row.type() === 'custom' && (
            <div className="GiftBoxRewardRow-custom">
              <input
                className="FormControl"
                type="text"
                bidi={row.customLabel}
                placeholder={app.translator.trans('mattoid-store-gift-box.admin.reward-custom-label')}
              />
              <textarea
                className="FormControl"
                rows={2}
                bidi={row.customPayload}
                placeholder={app.translator.trans('mattoid-store-gift-box.admin.reward-custom-payload')}
              ></textarea>
            </div>
          )}
          <div className="GiftBoxRewardRow-fx">
            {row.effectImage() ? (
              isVideoEffect(row.effectImage()) ? (
                <video className="GiftBoxFxImgThumb" src={row.effectImage()} autoPlay muted playsInline loop />
              ) : (
                <img className="GiftBoxFxImgThumb" src={row.effectImage()} alt="" />
              )
            ) : (
              <span className="GiftBoxFxImgThumb GiftBoxFxImgThumb--empty">
                <i className="fas fa-image" />
              </span>
            )}
            <Button className="Button" onclick={(e: Event) => this.uploadEffectImage(e, row)}>
              {app.translator.trans('mattoid-store-gift-box.admin.effect-image-upload')}
            </Button>
            {row.effectImage() && (
              <Button className="Button Button--danger" onclick={() => row.effectImage('')}>
                {app.translator.trans('mattoid-store-gift-box.admin.open-effect-clear')}
              </Button>
            )}
            <Button className="Button" icon="fas fa-eye" onclick={() => this.togglePreview(index)}>
              {app.translator.trans('mattoid-store-gift-box.admin.fx-preview')}
            </Button>
          </div>
        </div>

        {this.previewRows[index] && this.renderFxPreview(row)}
      </div>
    );
  }

  renderStoreSelect(row: RewardRow): Mithril.Children {
    if (!this.storeOptions) {
      return <div className="helpText">…</div>;
    }
    return Select.component({
      options: Object.assign(
        { 0: app.translator.trans('mattoid-store-gift-box.admin.reward-goods-select') },
        this.storeOptions
      ),
      value: row.storeId() || 0,
      onchange: (v: string) => (row.storeId = Stream(Number(v))),
    });
  }

  renderGroupSelect(row: RewardRow): Mithril.Children {
    const selected = row.groupIds();
    return (
      <div>
        {Object.keys(this.groupOptions).map((id) => {
          const gid = Number(id);
          const checked = selected.indexOf(gid) !== -1;
          return (
            <label className="checkbox" style="display:inline-block;margin-right:12px">
              <input
                type="checkbox"
                checked={checked}
                onchange={(e: Event) => {
                  const on = (e.target as HTMLInputElement).checked;
                  row.groupIds = Stream(on ? selected.concat([gid]) : selected.filter((x) => x !== gid));
                }}
              />
              {this.groupOptions[gid]}
            </label>
          );
        })}
      </div>
    );
  }

  uploadIcon(e: Event) {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webm';
    input.style.display = 'none';
    input.addEventListener(
      'change',
      () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        this.loading = true;
        app
          .request({
            url: `${app.forum.attribute('apiUrl')}/store/upload/icon`,
            method: 'POST',
            body,
          })
          .then(
            (result: any) => {
              this.icon = Stream(result.data.attributes.path);
              this.loading = false;
              m.redraw();
            },
            (error: any) => {
              this.loading = false;
              this.onerror(error);
            }
          );
      },
      { once: true }
    );
    document.body.appendChild(input);
    input.click();
  }

  togglePreview(index: number) {
    this.previewRows[index] = !this.previewRows[index];
    m.redraw();
  }

  /**
   * 开奖光效迷你预览：按所选光效类型 + 颜色播放小型动画
   */
  renderFxPreview(row: RewardRow): Mithril.Children {
    const color = row.beamEffect() === 'none' ? '#888' : row.beamColor() || '#ffd76e';
    const effect = row.beamEffect();

    return (
      <div className="GiftBoxFxPreviewWrap" style={`--beam-color: ${color}`}>
        <div className={`GiftBoxFxPreview GiftBoxFxPreview--${effect}`}>
          {effect === 'beam' && <i className="GiftBoxFxPreview-beam" />}
          {effect === 'burst' && (
            <span className="GiftBoxFxPreview-burst">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
          {effect === 'ring' && (
            <span className="GiftBoxFxPreview-ring">
              <i />
              <i />
              <i />
            </span>
          )}
          {effect === 'rays' && (
            <span className="GiftBoxFxPreview-rays">
              <i className="GiftBoxFxPreview-raysConic" />
              <i className="GiftBoxFxPreview-raysCore" />
            </span>
          )}
          {effect === 'rain' && (
            <span className="GiftBoxFxPreview-rain">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
          {effect === 'glow' && <span className="GiftBoxFxPreview-glow" />}
          {row.effectImage() ? (
            isVideoEffect(row.effectImage()) ? (
              <video className="GiftBoxFxPreview-img" src={row.effectImage()} autoPlay muted playsInline loop />
            ) : (
              <img className="GiftBoxFxPreview-img" src={row.effectImage()} alt="" />
            )
          ) : (
            <span className="GiftBoxFxPreview-ball">
              <i className="fas fa-gift" />
            </span>
          )}
        </div>
        <span className="GiftBoxFxPreview-label">
          {app.translator.trans('mattoid-store-gift-box.admin.fx-preview-' + (effect || 'beam'))}
        </span>
      </div>
    );
  }

  uploadEffectImage(e: Event, row: RewardRow) {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';
    input.style.display = 'none';
    input.addEventListener(
      'change',
      () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        app
          .request({
            url: `${app.forum.attribute('apiUrl')}/gift-box/upload`,
            method: 'POST',
            body,
          })
          .then((result: any) => {
            row.effectImage = Stream(result.data.path);
            m.redraw();
          }, this.onerror.bind(this));
      },
      { once: true }
    );
    document.body.appendChild(input);
    input.click();
  }

  uploadEffect(e: Event) {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';
    input.style.display = 'none';
    input.addEventListener(
      'change',
      () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        this.uploadingEffect = true;
        app
          .request({
            url: `${app.forum.attribute('apiUrl')}/gift-box/upload`,
            method: 'POST',
            body,
          })
          .then(
            (result: any) => {
              this.openEffect = Stream(result.data.path);
              this.uploadingEffect = false;
              m.redraw();
            },
            (error: any) => {
              this.uploadingEffect = false;
              this.onerror(error);
            }
          );
      },
      { once: true }
    );
    document.body.appendChild(input);
    input.click();
  }

  onsubmit(e: Event) {
    e.preventDefault();
    this.loading = true;

    const body = {
      name: this.name(),
      icon: this.icon(),
      desc: this.desc(),
      status: this.status(),
      sort: this.sort(),
      openEffect: this.openEffect(),
      openEffectDuration: Number(this.openEffectDuration()) || 0,
      overlayColor: this.overlayColor(),
      rewards: this.rewards.map((r, i) => ({
        type: r.type(),
        weight: Number(r.weight()) || 0,
        status: r.status(),
        sort: i,
        beamColor: r.beamColor(),
        overlayColor: r.overlayColor(),
        beamEffect: r.beamEffect(),
        effectImage: r.effectImage(),
        config:
          r.type() === 'money'
            ? { amount: Number(r.amount()) || 0 }
            : r.type() === 'goods'
            ? { storeId: Number(r.storeId()) || 0 }
            : r.type() === 'group'
            ? { groupIds: r.groupIds() }
            : { label: r.customLabel(), payload: r.customPayload() },
      })),
    };

    app
      .request({
        method: this.id ? 'PATCH' : 'POST',
        url: app.forum.attribute('apiUrl') + (this.id ? `/gift-box/packs/${this.id}` : '/gift-box/packs'),
        body,
      })
      .then(
        () => {
          this.loading = false;
          if (this.attrs.onSaved) this.attrs.onSaved();
          this.hide();
        },
        (error: any) => {
          this.loading = false;
          this.onerror(error);
        }
      );
  }
}
