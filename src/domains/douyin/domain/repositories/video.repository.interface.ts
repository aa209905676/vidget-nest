import { Video } from '../entities/video.entity';

/**
 * 视频仓储接口
 * 定义领域层与持久化层交互的契约
 */
export interface IVideoRepository {
  /**
   * 根据分享链接获取视频信息
   * @param shareUrl 分享链接
   */
  findByShareUrl(shareUrl: string): Promise<Video>;

  /**
   * 批量获取视频信息
   * @param shareUrls 分享链接数组
   */
  findByShareUrls(shareUrls: string[]): Promise<Video[]>;

  /**
   * 检查URL是否为有效的抖音链接
   * @param url 链接
   */
  isValidDouyinUrl(url: string): Promise<{ isValid: boolean; platform: string }>;
} 