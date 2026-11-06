<?php

namespace Mattoid\StoreGiftBox\Upload;

use Flarum\Foundation\ValidationException;
use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Support\Str;
use Psr\Http\Message\UploadedFileInterface;
use Symfony\Component\Mime\MimeTypes;

/**
 * 开启特效（GIF / 视频）上传器：写入 mattoid-gift-box 磁盘（public/assets/mattoid/giftBox）
 */
class GiftBoxEffectUploader
{
    /** 允许的媒体类型与扩展名 */
    const ALLOWED = [
        'image/gif' => 'gif',
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
    ];

    /** 大小上限 30MB */
    const MAX_SIZE = 31457280;

    protected $disk;

    public function __construct(Factory $filesystemFactory)
    {
        $this->disk = $filesystemFactory->disk('mattoid-gift-box');
    }

    public function upload(UploadedFileInterface $file): string
    {
        $mediaType = $file->getClientMediaType();
        if (!isset(self::ALLOWED[$mediaType])) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.effect-type-invalid')]);
        }
        if ($file->getSize() > self::MAX_SIZE) {
            throw new ValidationException(['message' => resolve('translator')->trans('mattoid-store-gift-box.admin.error.effect-too-large')]);
        }

        // 扩展名以服务端从 media type 猜测为准，不信任客户端文件名
        $ext = MimeTypes::getDefault()->getExtensions($mediaType)[0] ?? self::ALLOWED[$mediaType];
        $filename = time().'_'.Str::random(16).'.'.$ext;
        $stream = $file->getStream();
        $stream->rewind();
        $this->disk->put($filename, $stream->getContents());

        // 只存根相对路径，绝对 URL 由磁盘配置按请求生成
        $path = parse_url($this->disk->url($filename), PHP_URL_PATH);
        if (!$path || strpos($path, '/assets/') !== 0) {
            $path = '/assets/mattoid/giftBox/'.$filename;
        }

        return $path;
    }
}
