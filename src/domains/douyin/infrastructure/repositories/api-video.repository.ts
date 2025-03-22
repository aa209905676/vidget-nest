import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { IVideoRepository } from '../../domain/repositories/video.repository.interface';
import { Video } from '../../domain/entities/video.entity';

/**
 * 抖音API视频仓储实现
 * 基础设施层，实现领域层定义的仓储接口
 */
@Injectable()
export class ApiVideoRepository implements IVideoRepository {
  private readonly logger = new Logger(ApiVideoRepository.name);
  
  // 常量定义
  private readonly CACHE_EXPIRE = 3600000; // 1小时（毫秒）
  private readonly DOUYIN_DOMAIN_PATTERN = /^https?:\/\/(www\.)?(douyin\.com|iesdouyin\.com|v\.douyin\.com)\//;
  private readonly USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
  private readonly PC_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * 根据分享链接获取视频信息
   * @param shareUrl 分享链接
   */
  async findByShareUrl(shareUrl: string): Promise<Video> {
    this.logger.log(`开始解析抖音视频: ${shareUrl}`);

    // 1. 从缓存中获取
    const cacheKey = `douyin:video:${shareUrl}`;
    const cachedData = await this.cacheManager.get<Video>(cacheKey);
    if (cachedData) {
      this.logger.log('从缓存获取视频信息成功');
      return cachedData;
    }

    // 2. 处理短链接，获取真实链接
    this.logger.log('开始处理分享链接');
    const realUrl = await this.processShareUrl(shareUrl);
    this.logger.log(`分享链接处理完成, 真实URL: ${realUrl}`);

    // 3. 提取视频ID
    this.logger.log('开始提取视频ID');
    const videoId = await this.extractVideoId(realUrl);
    this.logger.log(`提取视频ID成功: ${videoId}`);

    // 4. 获取视频信息
    this.logger.log('开始获取视频信息');
    const videoInfo = await this.fetchVideoInfo(videoId);
    
    // 5. 创建Video实体
    const video = new Video(
      videoId,
      realUrl,
      videoInfo.title,
      videoInfo.author,
      videoInfo.coverUrl,
      videoInfo.duration
    );
    
    // 设置无水印URL
    video.setNoWatermarkUrl(videoInfo.videoUrl);
    
    // 6. 存入缓存
    this.logger.log('将视频信息存入缓存');
    await this.cacheManager.set(cacheKey, video, this.CACHE_EXPIRE);

    return video;
  }

  /**
   * 批量获取视频信息
   * @param shareUrls 分享链接数组
   */
  async findByShareUrls(shareUrls: string[]): Promise<Video[]> {
    const videos: Video[] = [];
    
    for (const url of shareUrls) {
      try {
        const video = await this.findByShareUrl(url);
        videos.push(video);
      } catch (error) {
        this.logger.warn(`解析视频失败, URL: ${url}, 错误: ${error.message}`);
      }
    }
    
    return videos;
  }

  /**
   * 检查URL是否为有效的抖音链接
   * @param url 待检查的URL
   */
  async isValidDouyinUrl(url: string): Promise<{ isValid: boolean; platform: string }> {
    const isDouyin = this.DOUYIN_DOMAIN_PATTERN.test(url);
    
    return {
      isValid: isDouyin,
      platform: 'douyin',
    };
  }

  /**
   * 处理分享链接，获取最终URL
   * @private
   */
  private async processShareUrl(shareUrl: string): Promise<string> {
    this.logger.log(`处理分享链接: ${shareUrl}`);

    // 检查URL格式
    if (!shareUrl.includes('douyin.com') && !shareUrl.includes('iesdouyin.com')) {
      throw new Error('无效的抖音分享链接');
    }

    // 如果是短链接，需要跟随重定向获取真实链接
    if (shareUrl.includes('v.douyin.com')) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(shareUrl, {
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400,
            headers: {
              'User-Agent': this.USER_AGENT,
            },
          })
        );

        // 获取重定向URL
        if (response.headers.location) {
          return response.headers.location;
        }
      } catch (error) {
        if (error.response && error.response.headers && error.response.headers.location) {
          return error.response.headers.location;
        }
        throw new Error(`获取真实链接失败: ${error.message}`);
      }
    }

    return shareUrl;
  }

  /**
   * 从URL中提取视频ID
   * @private
   */
  private async extractVideoId(url: string): Promise<string> {
    // 从URL中提取视频ID
    const idMatch = url.match(/video\/(\d+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }

    // 如果URL中没有直接的视频ID，尝试从页面内容中提取
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
          },
        })
      );

      const htmlContent = response.data;
      const idRegex = /video\/(\d+)/;
      const match = htmlContent.match(idRegex);
      if (match && match[1]) {
        return match[1];
      }
    } catch (error) {
      throw new Error(`获取视频ID失败: ${error.message}`);
    }

    throw new Error('无法从URL或页面内容中提取视频ID');
  }

  /**
   * 获取视频信息
   * @private
   */
  private async fetchVideoInfo(videoId: string): Promise<{
    videoUrl: string;
    coverUrl: string;
    title: string;
    author: string;
    duration: number;
  }> {
    try {
      // 构建API URL
      const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
      
      // 发送请求
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
          },
        })
      );

      // 解析响应
      const data = response.data;
      if (!data || !data.item_list || data.item_list.length === 0) {
        throw new Error('获取视频信息失败: API返回数据异常');
      }

      const videoInfo = data.item_list[0];
      
      // 提取无水印视频URL
      let videoUrl = '';
      if (videoInfo.video && videoInfo.video.play_addr && videoInfo.video.play_addr.url_list) {
        videoUrl = this.extractNoWatermarkUrl(videoInfo);
      }

      if (!videoUrl) {
        throw new Error('无法提取无水印视频URL');
      }

      // 构建返回数据
      return {
        videoUrl: videoUrl,
        coverUrl: videoInfo.video?.cover?.url_list?.[0] || '',
        title: videoInfo.desc || '',
        author: videoInfo.author?.nickname || '',
        duration: videoInfo.video?.duration || 0,
      };
    } catch (error) {
      throw new Error(`获取视频信息失败: ${error.message}`);
    }
  }

  /**
   * 提取无水印视频URL
   * @private
   */
  private extractNoWatermarkUrl(videoInfo: any): string {
    // 尝试获取播放地址
    if (videoInfo.video && videoInfo.video.play_addr && videoInfo.video.play_addr.url_list && videoInfo.video.play_addr.url_list.length > 0) {
      // 获取无水印地址，通常是替换域名
      let url = videoInfo.video.play_addr.url_list[0];
      
      // 替换域名，确保无水印
      url = url.replace('playwm', 'play');
      url = url.replace('aweme.snssdk.com', 'aweme.amemv.com');
      
      return url;
    }
    
    return '';
  }
} 