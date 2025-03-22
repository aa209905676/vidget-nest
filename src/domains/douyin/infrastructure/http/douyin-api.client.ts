import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 抖音API客户端
 * 提供与抖音API交互的低级别功能
 */
@Injectable()
export class DouyinApiClient {
  private readonly logger = new Logger(DouyinApiClient.name);
  
  // 常量定义
  private readonly BASE_API_URL = 'https://www.iesdouyin.com/web/api/v2';
  private readonly PC_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  private readonly MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

  constructor(private readonly httpService: HttpService) {}

  /**
   * 根据视频ID获取视频信息
   * @param videoId 视频ID
   */
  async getVideoInfo(videoId: string): Promise<any> {
    try {
      const apiUrl = `${this.BASE_API_URL}/aweme/iteminfo/?item_ids=${videoId}`;
      
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`获取视频信息失败: ${error.message}`, error.stack);
      throw new Error(`获取视频信息失败: ${error.message}`);
    }
  }

  /**
   * 跟随抖音短链接重定向
   * @param shortUrl 短链接URL
   */
  async followRedirect(shortUrl: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(shortUrl, {
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400,
          headers: {
            'User-Agent': this.MOBILE_USER_AGENT,
          },
        })
      );

      if (response.headers.location) {
        return response.headers.location;
      }
      
      this.logger.warn('短链接没有返回重定向URL');
      return shortUrl;
    } catch (error) {
      if (error.response && error.response.headers && error.response.headers.location) {
        return error.response.headers.location;
      }
      
      this.logger.error(`跟随重定向失败: ${error.message}`, error.stack);
      throw new Error(`跟随重定向失败: ${error.message}`);
    }
  }

  /**
   * 从HTML内容中提取视频ID
   * @param url 视频页面URL
   */
  async extractVideoIdFromPage(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': this.PC_USER_AGENT,
          },
        })
      );

      const htmlContent = response.data;
      
      // 尝试多种模式匹配视频ID
      const patterns = [
        /video\/(\d+)/,
        /itemId[=:"']+(\d+)/i,
        /id[=:"']+(\d+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      this.logger.warn('无法从页面提取视频ID');
      throw new Error('无法从页面提取视频ID');
    } catch (error) {
      this.logger.error(`提取视频ID失败: ${error.message}`, error.stack);
      throw new Error(`提取视频ID失败: ${error.message}`);
    }
  }

  /**
   * 请求API
   * @param path API路径
   * @param params 请求参数
   * @param useMobile 是否使用移动端UA
   */
  async request(path: string, params: Record<string, any> = {}, useMobile = false): Promise<any> {
    try {
      const apiUrl = `${this.BASE_API_URL}${path}`;
      
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          params,
          headers: {
            'User-Agent': useMobile ? this.MOBILE_USER_AGENT : this.PC_USER_AGENT,
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`API请求失败: ${error.message}`, error.stack);
      throw new Error(`API请求失败: ${error.message}`);
    }
  }
} 