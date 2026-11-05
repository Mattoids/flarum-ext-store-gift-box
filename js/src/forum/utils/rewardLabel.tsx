import app from 'flarum/forum/app';
import { formatMoney } from '@mattoid-store/forum';

/**
 * 奖励展示文案（开启弹窗与开启记录列表共用）
 */
export default function rewardLabel(drawn: any): string {
  if (!drawn) return '';
  const cfg = drawn.config || {};

  switch (drawn.type) {
    case 'money':
      if (cfg.convertedTitle) {
        return app.translator.trans('mattoid-store-gift-box.forum.reward-money-converted', {
          amount: formatMoney(cfg.amount),
          title: cfg.convertedTitle,
        }) as unknown as string;
      }
      // 货币单位与 store / money-with-history 插件口径一致
      return formatMoney(cfg.amount);
    case 'goods':
      return cfg.title || (app.translator.trans('mattoid-store-gift-box.admin.type-goods') as unknown as string);
    case 'group':
      return app.translator.trans('mattoid-store-gift-box.forum.reward-group', {
        names: (cfg.names || []).join('、'),
      }) as unknown as string;
    default:
      return app.translator.trans('mattoid-store-gift-box.forum.reward-custom', { label: cfg.label || '' }) as unknown as string;
  }
}

/**
 * 奖励图标（返回 mithril 子节点）
 */
export function rewardIcon(drawn: any, packIcon: string): any {
  const cfg = drawn && drawn.config ? drawn.config : {};
  const iconUrl = cfg.icon || packIcon;

  if (drawn && drawn.type === 'goods' && iconUrl && iconUrl.indexOf('/') !== -1) {
    return <img src={iconUrl} alt="" />;
  }
  const cls =
    drawn && drawn.type === 'money'
      ? 'fas fa-coins'
      : drawn && drawn.type === 'group'
      ? 'fas fa-id-card'
      : drawn && drawn.type === 'custom'
      ? 'fas fa-star'
      : 'fas fa-gift';
  return <i className={cls} />;
}
