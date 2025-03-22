/**
 * 视频信息响应DTO
 */
export class VideoInfoResponseDto {
  videoUrl: string;   // 无水印视频地址
  coverUrl: string;   // 视频封面图
  title: string;      // 视频标题
  author: string;     // 作者昵称
  duration: number;   // 视频时长(秒)
}

/**
 * 批量解析响应DTO
 */
export class BatchVideoInfoResponseDto {
  videos: VideoInfoResponseDto[];
}

/**
 * 链接检测响应DTO
 */
export class CheckUrlResponseDto {
  isValid: boolean;
  platform: string;
}

/**
 * 版本信息响应DTO
 */
export class VersionResponseDto {
  version: string;
  buildTime: string;
  maintainer: string;
  description: string;
} 