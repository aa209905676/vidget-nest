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
  private readonly DOUYIN_DOMAIN_PATTERN =
    /^https?:\/\/(www\.)?(douyin\.com|iesdouyin\.com|v\.douyin\.com)\//;
  private readonly USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
  private readonly PC_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    this.logger.log('视频信息获取成功');

    // 5. 创建Video实体
    const video = new Video(
      videoId,
      realUrl,
      videoInfo.title,
      videoInfo.author,
      videoInfo.coverUrl,
      videoInfo.duration,
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
  async isValidDouyinUrl(
    url: string,
  ): Promise<{ isValid: boolean; platform: string }> {
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
    if (
      !shareUrl.includes('douyin.com') &&
      !shareUrl.includes('iesdouyin.com')
    ) {
      throw new Error('无效的抖音分享链接');
    }

    // 如果是短链接，需要跟随重定向获取真实链接
    if (shareUrl.includes('v.douyin.com')) {
      try {
        this.logger.log('检测到短链接，尝试获取真实URL');
        const response = await firstValueFrom(
          this.httpService.get(shareUrl, {
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400,
            headers: {
              'User-Agent': this.USER_AGENT,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
          }),
        );

        // 获取重定向URL
        if (response.headers.location) {
          const location = response.headers.location;
          this.logger.log(`获取到重定向URL: ${location}`);

          // 修正URL格式问题 - 检查URL是否被错误拼接
          if (location.includes('video/') && !location.includes('?')) {
            // 查找数字ID后面的第一个非数字字符的位置
            const match = location.match(/\/video\/(\d+)([^\d])/);
            if (match) {
              const videoId = match[1];
              const nextChar = match[2];
              const correctUrl = location.replace(
                `/video/${videoId}${nextChar}`,
                `/video/${videoId}?${nextChar}`,
              );
              this.logger.log(`修正后的URL: ${correctUrl}`);
              return correctUrl;
            }
          }

          return location;
        }
      } catch (error) {
        if (
          error.response &&
          error.response.headers &&
          error.response.headers.location
        ) {
          const location = error.response.headers.location;
          this.logger.log(`从错误响应中获取到重定向URL: ${location}`);

          // 同样需要修正URL格式问题
          if (location.includes('video/') && !location.includes('?')) {
            const match = location.match(/\/video\/(\d+)([^\d])/);
            if (match) {
              const videoId = match[1];
              const nextChar = match[2];
              const correctUrl = location.replace(
                `/video/${videoId}${nextChar}`,
                `/video/${videoId}?${nextChar}`,
              );
              this.logger.log(`修正后的URL: ${correctUrl}`);
              return correctUrl;
            }
          }

          return location;
        }
        this.logger.error(`获取真实链接失败: ${error.message}`);
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
    this.logger.log(`尝试从URL提取视频ID: ${url}`);

    // 检查URL是否包含已知问题
    if (url.includes('video/')) {
      const match = url.match(/\/video\/(\d+)/);
      if (match && match[1]) {
        this.logger.log(`从URL直接提取到视频ID: ${match[1]}`);
        return match[1];
      }
    }

    // 从查询参数中提取
    try {
      const urlObj = new URL(url);
      const itemId = urlObj.searchParams.get('item_id');
      if (itemId) {
        this.logger.log(`从查询参数提取到视频ID: ${itemId}`);
        return itemId;
      }
    } catch (error) {
      this.logger.warn(`解析URL失败: ${error.message}`);
    }

    // 如果URL中没有直接的视频ID，尝试从页面内容中提取
    try {
      this.logger.log('从页面内容中提取视频ID');
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Referer: 'https://www.douyin.com/',
          },
        }),
      );

      const htmlContent = response.data;

      // 尝试多种提取方式
      const patterns = [
        /video\/(\d+)/, // URL格式
        /itemId["':=]+(\d+)/, // JavaScript变量
        /"itemId"\s*:\s*"(\d+)"/, // JSON格式
        /item_ids=(\d+)/, // 查询参数
        /awemeId["':=]+(\d+)/, // 另一种ID格式
      ];

      for (const pattern of patterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          this.logger.log(`从HTML中提取到视频ID: ${match[1]}`);
          return match[1];
        }
      }
    } catch (error) {
      this.logger.error(`获取视频页面失败: ${error.message}`);
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
      this.logger.log(`请求API: ${apiUrl}`);

      // 发送请求
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
            Referer: 'https://www.douyin.com/',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          timeout: 10000,
        }),
      );

      // 解析响应
      const data = response.data;
      if (!data || !data.item_list || data.item_list.length === 0) {
        throw new Error('获取视频信息失败: API返回数据异常');
      }

      const videoInfo = data.item_list[0];
      this.logger.log('API返回的视频信息:', JSON.stringify(videoInfo));

      // 提取无水印视频URL
      let videoUrl = this.extractNoWatermarkUrl(videoInfo);

      // 如果没有从API提取到视频URL，尝试使用直接构建的URL
      if (!videoUrl) {
        this.logger.log('通过API无法提取视频URL，尝试直接构建');
        videoUrl = this.constructVideoUrl(videoId, videoInfo);
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
      this.logger.error(`获取视频信息失败: ${error.message}`);
      throw new Error(`获取视频信息失败: ${error.message}`);
    }
  }

  /**
   * 从API响应中提取无水印视频URL
   * @private
   */
  private extractNoWatermarkUrl(videoInfo: any): string {
    this.logger.log('尝试从API响应提取无水印URL');

    try {
      // 方法1: 尝试从play_addr获取视频链接
      if (
        videoInfo.video?.play_addr?.url_list &&
        videoInfo.video.play_addr.url_list.length > 0
      ) {
        // 通常最后一个URL是无水印版本
        const urls = videoInfo.video.play_addr.url_list;
        let url = urls[urls.length - 1];

        // 替换域名和路径，移除水印
        url = url.replace('playwm', 'play');
        url = url.replace('watermark=1', 'watermark=0');
        url = url.replace('&ratio=720p', '');
        url = url.replace('aweme.snssdk.com', 'api.amemv.com');

        this.logger.log(`从play_addr提取的URL: ${url}`);
        return url;
      }

      // 方法2: 尝试从download_addr获取
      if (
        videoInfo.video?.download_addr?.url_list &&
        videoInfo.video.download_addr.url_list.length > 0
      ) {
        const urls = videoInfo.video.download_addr.url_list;
        let url = urls[urls.length - 1];

        // 替换域名和参数
        url = url.replace('watermark=1', 'watermark=0');

        this.logger.log(`从download_addr提取的URL: ${url}`);
        return url;
      }

      // 方法3: 如果有nwm_video_url_list字段
      if (
        videoInfo.video?.nwm_video_url_list &&
        videoInfo.video.nwm_video_url_list.length > 0
      ) {
        const url = videoInfo.video.nwm_video_url_list[0];
        this.logger.log(`从nwm_video_url_list提取的URL: ${url}`);
        return url;
      }

      // 方法4: 如果有bit_rate字段
      if (videoInfo.video?.bit_rate && videoInfo.video.bit_rate.length > 0) {
        const highestQuality = videoInfo.video.bit_rate.reduce((prev, curr) =>
          prev.bit_rate > curr.bit_rate ? prev : curr,
        );

        if (
          highestQuality.play_addr?.url_list &&
          highestQuality.play_addr.url_list.length > 0
        ) {
          let url = highestQuality.play_addr.url_list[0];
          url = url.replace('playwm', 'play');

          this.logger.log(`从bit_rate提取的URL: ${url}`);
          return url;
        }
      }

      this.logger.warn('无法从API响应中提取视频URL');
      return '';
    } catch (error) {
      this.logger.error(`提取无水印URL时出错: ${error.message}`);
      return '';
    }
  }

  /**
   * 直接构建视频URL
   * @private
   */
  private constructVideoUrl(videoId: string, videoInfo: any): string {
    this.logger.log('尝试直接构建视频URL');

    try {
      // 尝试构建不同格式的视频URL
      const urls = [
        // 尝试构建aweme格式的URL
        `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`,
        // 另一种格式
        `https://api.amemv.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`,
      ];

      // 如果能从videoInfo中提取到uri，使用它构建更精确的URL
      if (videoInfo.video?.play_addr?.uri) {
        const uri = videoInfo.video.play_addr.uri;
        urls.unshift(
          `https://aweme.snssdk.com/aweme/v1/play/?video_id=${uri}&ratio=720p&line=0`,
        );
      }

      this.logger.log(`构建的URL列表: ${JSON.stringify(urls)}`);

      // 返回第一个URL，实际使用时可能需要验证哪个URL可用
      return urls[0];
    } catch (error) {
      this.logger.error(`构建视频URL时出错: ${error.message}`);
      return '';
    }
  }

  /**
   * 从API获取视频信息
   * @private
   */
  private async fetchVideoInfoFromApi(videoId: string): Promise<{
    videoUrl: string;
    coverUrl: string;
    title: string;
    author: string;
    duration: number;
  }> {
    try {
      // 构建API URL
      const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
      this.logger.log(`请求API: ${apiUrl}`);

      // 更全面的浏览器模拟头信息
      const headers = {
        'User-Agent': this.PC_USER_AGENT,
        Referer: 'https://www.douyin.com/',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'sec-ch-ua':
          '"Chromium";v="123", "Google Chrome";v="123", "Not:A-Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      };

      // 发送请求
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers,
          timeout: 10000,
        }),
      );

      this.logger.log(`API响应状态: ${response.status}`);

      // 处理空数据响应
      if (!response.data || response.data === '') {
        this.logger.warn('API返回了空数据');
        return {
          videoUrl: '',
          coverUrl: '',
          title: '',
          author: '',
          duration: 0,
        };
      }

      // 解析响应
      const data = response.data;
      if (!data || !data.item_list || data.item_list.length === 0) {
        this.logger.warn('API返回数据异常');
        return {
          videoUrl: '',
          coverUrl: '',
          title: '',
          author: '',
          duration: 0,
        };
      }

      const videoInfo = data.item_list[0];
      this.logger.log('成功从API获取视频信息');

      // 提取无水印视频URL
      let videoUrl = '';
      if (
        videoInfo.video &&
        videoInfo.video.play_addr &&
        videoInfo.video.play_addr.url_list
      ) {
        videoUrl = this.extractNoWatermarkUrl(videoInfo);
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
      this.logger.error(`API调用失败: ${error.message}`);
      return {
        videoUrl: '',
        coverUrl: '',
        title: '',
        author: '',
        duration: 0,
      };
    }
  }

  /**
   * 通过网页抓取获取视频信息
   * @private
   */
  private async fetchVideoInfoByWebScraping(videoId: string): Promise<{
    videoUrl: string;
    coverUrl: string;
    title: string;
    author: string;
    duration: number;
  }> {
    try {
      const url = `https://www.douyin.com/video/${videoId}`;
      this.logger.log(`尝试从网页获取视频信息: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Referer: 'https://www.douyin.com/',
          },
          timeout: 15000,
        }),
      );

      const htmlContent = response.data;

      // 从HTML中提取关键信息
      this.logger.log('尝试从HTML提取视频信息');

      // 尝试查找视频URL
      let videoUrl = '';
      let coverUrl = '';
      let title = '';
      let author = '';
      let duration = 0;

      // 尝试从renderData中提取
      const renderDataMatch = htmlContent.match(
        /window\.__RENDER_DATA__\s*=\s*([^<]+)<\/script>/,
      );
      if (renderDataMatch && renderDataMatch[1]) {
        try {
          const decodedData = decodeURIComponent(renderDataMatch[1]);
          const renderData = JSON.parse(decodedData);

          // 遍历可能的视频信息路径
          if (
            renderData.app &&
            renderData.app.initialState &&
            renderData.app.initialState.aweme
          ) {
            const awemeDetail = renderData.app.initialState.aweme.detail;
            if (awemeDetail) {
              this.logger.log('在renderData中找到视频信息');
              videoUrl = this.findVideoUrlInAwemeDetail(awemeDetail);
              coverUrl = awemeDetail.video?.cover?.url_list?.[0] || '';
              title = awemeDetail.desc || '';
              author = awemeDetail.author?.nickname || '';
              duration = awemeDetail.video?.duration || 0;
            }
          }
        } catch (parseError) {
          this.logger.error(`解析RENDER_DATA失败: ${parseError.message}`);
        }
      }

      // 尝试从初始状态中提取
      if (!videoUrl) {
        const stateMatch = htmlContent.match(
          /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
        );
        if (stateMatch && stateMatch[1]) {
          try {
            const state = JSON.parse(stateMatch[1]);

            // 在state中查找视频信息
            if (state.aweme && state.aweme.detail) {
              this.logger.log('在INITIAL_STATE中找到视频信息');
              const detail = state.aweme.detail;
              videoUrl = this.findVideoUrlInAwemeDetail(detail);
              coverUrl = detail.video?.cover?.url_list?.[0] || '';
              title = detail.desc || '';
              author = detail.author?.nickname || '';
              duration = detail.video?.duration || 0;
            }
          } catch (parseError) {
            this.logger.error(`解析INITIAL_STATE失败: ${parseError.message}`);
          }
        }
      }

      // 如果通过JavaScript变量提取失败，尝试直接从HTML中提取
      if (!title) {
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].replace(' - 抖音', '').trim();
        }
      }

      return {
        videoUrl,
        coverUrl,
        title,
        author,
        duration,
      };
    } catch (error) {
      this.logger.error(`网页抓取失败: ${error.message}`);
      throw new Error(`获取视频信息失败: ${error.message}`);
    }
  }

  /**
   * 在aweme详情对象中查找视频URL
   * @private
   */
  private findVideoUrlInAwemeDetail(detail: any): string {
    if (!detail) return '';

    try {
      // 检查play_addr
      if (detail.video?.play_addr?.url_list?.length > 0) {
        let url = detail.video.play_addr.url_list[0];
        url = url.replace('playwm', 'play');
        url = url.replace('http:', 'https:');
        return url;
      }

      // 检查download_addr
      if (detail.video?.download_addr?.url_list?.length > 0) {
        let url = detail.video.download_addr.url_list[0];
        url = url.replace('http:', 'https:');
        return url;
      }

      // 检查play_url对象
      if (detail.video?.play_url) {
        if (typeof detail.video.play_url === 'string') {
          return detail.video.play_url;
        } else if (detail.video.play_url.url_list?.length > 0) {
          return detail.video.play_url.url_list[0];
        }
      }
    } catch (error) {
      this.logger.error(`查找视频URL失败: ${error.message}`);
    }

    return '';
  }
}
