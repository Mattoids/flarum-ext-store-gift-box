/**
 * 解析 GIF 单轮播放时长（毫秒）
 *
 * 遍历 GIF89a 数据块：累加每个 Graphic Control Extension 的帧延迟。
 * 用于开启特效：按动图实际播放一轮的时长控制开奖时机，
 * 不受 GIF 内嵌循环次数（NETSCAPE 扩展）影响。
 *
 * 解析失败（非标准文件/网络错误）时 resolve(0)，调用方回退默认时长。
 */
export default function parseGifDuration(url: string): Promise<number> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) return 0;
      return res.arrayBuffer();
    })
    .then((buffer) => {
      try {
        return parseBuffer(new Uint8Array(buffer));
      } catch (e) {
        return 0;
      }
    })
    .catch(() => 0);
}

function parseBuffer(bytes: Uint8Array): number {
  if (bytes.length < 13) return 0;
  // 只支持 GIF87a / GIF89a
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return 0;

  const view = new DataView(bytes.buffer, bytes.byteOffset);
  let pos = 6;
  // 逻辑屏幕描述符（7 字节）
  const packed = view.getUint8(pos + 4);
  pos += 7;
  // 全局颜色表
  if (packed & 0x80) {
    pos += 3 * (1 << ((packed & 0x07) + 1));
  }

  let total = 0;
  while (pos < bytes.length) {
    const marker = view.getUint8(pos);
    if (marker === 0x3b) {
      // 结束
      break;
    } else if (marker === 0x21) {
      // 扩展块
      const label = view.getUint8(pos + 1);
      pos += 2;
      if (label === 0xf9) {
        // 图形控制扩展：延迟时间在块数据的第 2-3 字节（单位 10ms）
        const blockSize = view.getUint8(pos);
        if (blockSize >= 4) {
          total += view.getUint16(pos + 2, true) * 10;
        }
      }
      pos = skipSubBlocks(bytes, pos);
    } else if (marker === 0x2c) {
      // 图像描述符（10 字节）
      const imgPacked = view.getUint8(pos + 9);
      pos += 10;
      // 局部颜色表
      if (imgPacked & 0x80) {
        pos += 3 * (1 << ((imgPacked & 0x07) + 1));
      }
      // LZW 最小码长 + 图像数据子块
      pos += 1;
      pos = skipSubBlocks(bytes, pos);
    } else {
      break;
    }
  }

  return total;
}

/** 跳过一系列子块（首字节为长度，0 结束） */
function skipSubBlocks(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const size = bytes[pos];
    pos += 1;
    if (size === 0) break;
    pos += size;
  }
  return pos;
}
