/**
 * 开启特效媒体类型工具（管理端与论坛端共用）
 */

const VIDEO_EXTS = ['mp4', 'webm', 'mov'];

/** 特效地址是否为视频（按扩展名判断） */
export function isVideoEffect(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return VIDEO_EXTS.some((ext) => clean.endsWith('.' + ext));
}
