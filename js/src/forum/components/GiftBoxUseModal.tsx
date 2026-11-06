import app from 'flarum/forum/app';
import Modal, { IInternalModalAttrs } from 'flarum/common/components/Modal';
import Alert from 'flarum/common/components/Alert';
import type Mithril from 'mithril';
import rewardLabel, { rewardIcon } from '../utils/rewardLabel';
import parseGifDuration from '../utils/gif';
import { isVideoEffect } from '../../common/utils/effectMedia';

/** 读取视频时长（毫秒），失败时 resolve(0) */
function parseVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration * 1000 : 0);
    video.onerror = () => resolve(0);
    video.src = url;
  });
}

interface IGiftBoxUseModalAttrs extends IInternalModalAttrs {
  /** 背包条目（attributes 含 refId / title / subtype） */
  item: any;
  result?: any;
  /** 预载的开启特效地址（来自背包卡片，避免开场闪默认动画） */
  effectUrl?: string;
  /** 预载的礼包默认遮罩色（来自背包卡片，弹窗一打开即替换默认遮罩） */
  overlayColor?: string;
}

interface DrawnData {
  packName: string;
  packIcon: string;
  beamColor: string;
  openEffect: string;
  /** 特效自定义时长（秒，0 = 自动跟随 GIF/视频实际时长） */
  openEffectDuration: number;
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

  /** 特效播放时长（毫秒）：自定义时长优先，其次解析出的 GIF/视频时长，0 = 解析失败 */
  private effectMs: number = 0;
  private drawnLoaded: boolean = false;
  private durationReady: boolean = false;
  private durationParsed: boolean = false;
  private scheduled: boolean = false;

  oninit(vnode: Mithril.Vnode<IGiftBoxUseModalAttrs, this>) {
    super.oninit(vnode);

    this.resolveDuration();
    this.loadDrawn();
  }

  /**
   * 确定特效播放时长：设置了自定义秒数则直接采用；否则解析 GIF/视频实际时长。
   * 特效地址可能来自背包预载（attrs）或开奖结果（drawn），两处都会触发本方法。
   */
  private resolveDuration() {
    if (this.durationReady) {
      return;
    }

    const customSec = this.effectDuration();
    if (customSec > 0) {
      this.effectMs = customSec * 1000;
      this.durationReady = true;
      this.scheduleOpen();
      return;
    }

    const url = this.effectUrl();
    if (!url) {
      // 开奖结果还没回来时特效地址可能为空，等 loadDrawn 再触发
      if (this.drawnLoaded) {
        this.durationReady = true;
      }
      return;
    }
    if (this.durationParsed) {
      return;
    }
    this.durationParsed = true;

    const parse = isVideoEffect(url) ? parseVideoDuration : parseGifDuration;
    parse(url).then((ms) => {
      // 解析期间可能已确定使用自定义时长，不再覆盖
      if (this.durationReady) {
        return;
      }
      this.effectMs = ms;
      this.durationReady = true;
      this.scheduleOpen();
    });
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
          // 触发重绘：自定义 GIF/视频特效需要在开奖前展示出来
          m.redraw();
          this.drawnLoaded = true;
          this.resolveDuration();
          this.scheduleOpen();
        },
        () => {
          this.error = app.translator.trans('mattoid-store-gift-box.forum.error.drawn-not-found');
          // 出错也走完开盖流程，避免弹窗卡死
          this.drawnLoaded = true;
          this.resolveDuration();
          this.scheduleOpen();
        }
      );
  }

  /**
   * 开奖时机：有特效时按"自定义时长 > GIF/视频实际时长"的顺序取值
   * （最短 1.5s 防止一闪而过，解析失败回退默认时长）；无特效用内置动画的固定跳动时长。
   * 需等"抽奖结果返回"与"时长确定"都完成。
   */
  scheduleOpen() {
    if (this.scheduled || !this.drawnLoaded || !this.durationReady) {
      return;
    }
    this.scheduled = true;

    const hasEffect = !!this.effectUrl();
    const effectDelay = this.effectMs > 0 ? Math.max(this.effectMs, 1500) : SHAKE_MIN_MS;
    const target = hasEffect ? effectDelay : SHAKE_MIN_MS;

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
   * 礼包配置了自定义开启特效（GIF/视频）：等待开奖期间播放
   */
  hasEffect(): boolean {
    return !!this.effectUrl();
  }

  effectUrl(): string {
    return this.attrs.effectUrl || (this.drawn && this.drawn.openEffect) || '';
  }

  /** 特效自定义时长（秒，0 = 自动） */
  effectDuration(): number {
    return (this.drawn && this.drawn.openEffectDuration) || 0;
  }

  content(): Mithril.Children {
    // 奖励级遮罩色（开奖结果）优先，其次礼包默认（背包预载）；E6 = 90% 不透明，保持半透明
    const overlayColor = (this.drawn && this.drawn.overlayColor) || this.attrs.overlayColor || '';
    return (
      <div className="Modal-body">
        {overlayColor && <div className="GiftBoxOverlay" style={`background: ${overlayColor}E6`} />}
        <div className={`GiftBoxStage GiftBoxStage--${this.phase}`}>
          {this.phase !== 'reveal' &&
            (this.hasEffect() ? (
              isVideoEffect(this.effectUrl()) ? (
                <video className="GiftBoxEffectGif" src={this.effectUrl()} autoPlay muted playsInline loop />
              ) : (
                <img className="GiftBoxEffectGif" src={this.effectUrl()} alt="" />
              )
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
        <div className="GiftBoxReward-visual">
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
            isVideoEffect(effectImage) ? (
              <video className="GiftBoxReward-effectImg" src={effectImage} autoPlay muted playsInline loop />
            ) : (
              <img className="GiftBoxReward-effectImg" src={effectImage} alt="" />
            )
          ) : (
            <div className="GiftBoxReward-icon">{rewardIcon(reward, drawn.packIcon)}</div>
          )}
        </div>
        <div className="GiftBoxReward-label">{rewardLabel(reward)}</div>
        <div className="GiftBoxReward-tip">{app.translator.trans('mattoid-store-gift-box.forum.open-again-tip')}</div>
      </div>
    );
  }
}
