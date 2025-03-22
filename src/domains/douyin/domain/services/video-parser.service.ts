import { Video } from '../entities/video.entity';
import { VideoInfo } from '../value-objects/video-info.vo';
import { IVideoRepository } from '../repositories/video.repository.interface';

/**
 * 视频解析领域服务
 * 处理跨实体的业务逻辑
 */
export class VideoParserService {
  constructor(private readonly videoRepository: IVideoRepository) {}

  /**
   * 解析单个抖音链接
   * @param shareUrl 抖音分享链接
   */
  async parseVideo(shareUrl: string): Promise<VideoInfo> {
    const video = await this.videoRepository.findByShareUrl(shareUrl);
    
    if (!video.isProcessed()) {
      throw new Error('无法解析视频');
    }
    
    return VideoInfo.fromEntity(video);
  }

  /**
   * 批量解析抖音链接
   * @param shareUrls 抖音分享链接数组
   */
  async parseBatchVideos(shareUrls: string[]): Promise<VideoInfo[]> {
    const videos = await this.videoRepository.findByShareUrls(shareUrls);
    
    if (videos.length === 0) {
      throw new Error('未能解析任何视频');
    }
    
    return videos
      .filter(video => video.isProcessed())
      .map(video => VideoInfo.fromEntity(video));
  }

  /**
   * 检查链接是否为有效的抖音链接
   * @param url 待检查的URL
   */
  async checkUrl(url: string): Promise<{ isValid: boolean; platform: string }> {
    return this.videoRepository.isValidDouyinUrl(url);
  }
} 