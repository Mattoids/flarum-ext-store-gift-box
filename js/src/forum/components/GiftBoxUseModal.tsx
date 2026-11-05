import app from 'flarum/forum/app';
import Modal, { IInternalModalAttrs } from 'flarum/common/components/Modal';
import Alert from 'flarum/common/components/Alert';
import type Mithril from 'mithril';
import rewardLabel, { rewardIcon } from '../utils/rewardLabel';
import parseGifDuration from '../utils/gif';

interface IGiftBoxUseModalAttrs extends IInternalModalAttrs {
  /** 背包条目（attributes 含 refId / title / subtype） */
  item: any;
  result?: any;
  /** 预载的开启特效地址（来自背包卡片，避免开场闪默认动画） */
  effectUrl?: string;
}

interface DrawnData {
  packName: string;
  packIcon: string;
  beamColor: string;
  openEffect: string;
  /** 遮罩层颜色：奖励级优先，其次礼包默认，空 = 论坛默认遮罩 */
  overlayColor: string;
  drawn: {
    type: string;
    weight: number;
    config: any;
  };
  drawnAt: string;
}

type Phase = 'shaking' | 'open' | 'reveal';

const SHAKE_MIN_MS = 2200;
const OPEN_MS = 700;

/**
 * 礼包开启特效弹窗：
 * 1. 礼盒跳动、鼓起（等待后台抽奖结果）
 * 2. 盒盖飞起 + 光芒爆发
 * 3. 按奖励类型展示对应图标与闪光特效
 */
export default class GiftBoxUseModal extends Modal<IGiftBoxUseModalAttrs> {
  private phase: Phase = 'shaking';
  private drawn: DrawnData | null = null;
  private error: string | null = null;
  private startedAt: number = Date.now();

  /** GIF 单轮播放时长（解析失败为 0） */
  private gifMs: number = 0;
  private drawnLoaded: boolean = false;
  private durationReady: boolean = false;
  private scheduled: boolean = false;

  oninit(vnode: Mithril.Vnode<IGiftBoxUseModalAttrs, this>) {
    super.oninit(vnode);

    if (this.effectUrl()) {
      // 解析 GIF 单轮时长：按动图实际播放一轮的时间开奖，不受内嵌循环次数影响
      parseGifDuration(this.effectUrl()).then((ms) => {
        this.gifMs = ms;
        this.durationReady = true;
        this.scheduleOpen();
      });
    } else {
      this.durationReady = true;
    }

    this.loadDrawn();
  }

  className(): string {
    return 'Modal--small GiftBoxUseModal';
  }

  title(): Mithril.Children {
    return '';
  }

  loadDrawn() {
    const refId = this.attrs.item && this.attrs.item.refId;
    app
      .request({
        method: 'GET',
        url: `${app.forum.attribute('apiUrl')}/gift-box/drawn/${refId}`,
      })
      .then(
        (result: any) => {
          this.drawn = result && result.data ? result.data : null;
          // 触发重绘：自定义 GIF 特效需要在开奖前展示出来
          m.redraw();
          this.drawnLoaded = true;
          this.scheduleOpen();
        },
        () => {
          this.error = app.translator.trans('mattoid-store-gift-box.forum.error.drawn-not-found');
          // 出错也走完开盖流程，避免弹窗卡死
          this.drawnLoaded = true;
          this.scheduleOpen();
        }
      );
  }

  /**
   * 开奖时机：有 GIF 时按动图单轮播放时长（最短 1.5s 防止一闪而过，
   * 解析失败回退默认时长）；无 GIF 用内置动画的固定跳动时长。
   * 需等"抽奖结果返回"与"GIF 时长解析"都完成。
   */
  scheduleOpen() {
    if (this.scheduled || !this.drawnLoaded || !this.durationReady) {
      return;
    }
    this.scheduled = true;

    const useGif = !!this.effectUrl();
    const gifDelay = this.gifMs > 0 ? Math.max(this.gifMs, 1500) : SHAKE_MIN_MS;
    const target = useGif ? gifDelay : SHAKE_MIN_MS;

    const elapsed = Date.now() - this.startedAt;
    const wait = Math.max(0, target - elapsed);
    setTimeout(() => {
      this.phase = 'open';
      m.redraw();
      setTimeout(() => {
        this.phase = 'reveal';
        m.redraw();
      }, OPEN_MS);
    }, wait);
  }

  /**
   * 礼包配置了自定义开启特效（GIF）：等待开奖期间播放
   */
  hasEffect(): boolean {
    return !!this.effectUrl();
  }

  effectUrl(): string {
    return this.attrs.effectUrl || (this.drawn && this.drawn.openEffect) || '';
  }

  content(): Mithril.Children {
    const overlayColor = (this.drawn && this.drawn.overlayColor) || '';
    return (
      <div className="Modal-body">
        {overlayColor && <div className="GiftBoxOverlay" style={`background: ${overlayColor}`} />}
        <div className={`GiftBoxStage GiftBoxStage--${this.phase}`}>
          {this.phase !== 'reveal' &&
            (this.hasEffect() ? (
              <img className="GiftBoxEffectGif" src={this.effectUrl()} alt="" />
            ) : (
              <div className="GiftBoxWrap">
                <div className="GiftBox">
                  <div className="GiftBox-glow" />
                  <div className="GiftBox-sparkles">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="GiftBox-body" />
                  <div className="GiftBox-lid">
                    <div className="GiftBox-bow">
                      <i className="GiftBox-bowLoop GiftBox-bowLoop--l" />
                      <i className="GiftBox-bowLoop GiftBox-bowLoop--r" />
                      <i className="GiftBox-bowTail GiftBox-bowTail--l" />
                      <i className="GiftBox-bowTail GiftBox-bowTail--r" />
                    </div>
                  </div>
                </div>
                <div className="GiftBoxGround" />
              </div>
            ))}
          {this.phase === 'reveal' && this.renderReward()}
        </div>

        {this.phase !== 'reveal' && <div className="GiftBoxOpeningText">{app.translator.trans('mattoid-store-gift-box.forum.opening')}</div>}

        {this.phase === 'reveal' && this.error && (
          <div>
            <Alert type="error" dismissible={false}>
              {this.error}
            </Alert>
          </div>
        )}
      </div>
    );
  }

  renderReward(): Mithril.Children {
    const drawn = this.drawn;
    if (!drawn || !drawn.drawn) {
      return (
        <div className="GiftBoxReward">
          <div className="GiftBoxReward-icon">
            <i className="fas fa-question" />
          </div>
          <div className="GiftBoxReward-label">{this.error || '—'}</div>
        </div>
      );
    }

    const reward = drawn.drawn;
    const cfg = reward.config || {};
    const beamColor = cfg.beamColor || drawn.beamColor || '#ffd76e';
    const beamEffect = cfg.beamEffect || 'beam';
    const effectImage = cfg.effectImage || '';

    return (
      <div className="GiftBoxReward" style={`--beam-color: ${beamColor}`}>
        {beamEffect === 'beam' && (
          <div className="GiftBoxBeam">
            <i className="GiftBoxBeam-dust GiftBoxBeam-dust--1" />
            <i className="GiftBoxBeam-dust GiftBoxBeam-dust--2" />
            <i className="GiftBoxBeam-dust GiftBoxBeam-dust--3" />
            <i className="GiftBoxBeam-dust GiftBoxBeam-dust--4" />
            <i className="GiftBoxBeam-dust GiftBoxBeam-dust--5" />
          </div>
        )}
        {beamEffect === 'beam' && <div className="GiftBoxBeam-pool" />}
        {beamEffect === 'burst' && (
          <div className="GiftBoxBurstFx">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {beamEffect === 'burst' && <div className="GiftBoxBurstFx-core" />}
        {beamEffect === 'ring' && (
          <div className="GiftBoxRingFx">
            <i />
            <i />
            <i />
          </div>
        )}
        {beamEffect === 'rays' && (
          <div className="GiftBoxRaysFx">
            <i className="GiftBoxRaysFx-conic" />
            <i className="GiftBoxRaysFx-core" />
          </div>
        )}
        {beamEffect === 'rain' && (
          <div className="GiftBoxRainFx">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {beamEffect === 'glow' && <div className="GiftBoxGlowFx" />}
        {beamEffect !== 'none' && <div className="GiftBoxReward-halo" />}
        {effectImage ? (
          <img className="GiftBoxReward-effectImg" src={effectImage} alt="" />
        ) : (
          <div className="GiftBoxReward-icon">{rewardIcon(reward, drawn.packIcon)}</div>
        )}
        <div className="GiftBoxReward-label">{rewardLabel(reward)}</div>
        <div className="GiftBoxReward-tip">{app.translator.trans('mattoid-store-gift-box.forum.open-again-tip')}</div>
      </div>
    );
  }
}
