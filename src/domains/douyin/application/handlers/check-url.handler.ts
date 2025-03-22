import { Injectable } from '@nestjs/common';
import { VideoParserService } from '../../domain/services/video-parser.service';
import { CheckUrlQuery, GetVersionQuery } from '../queries/check-url.query';
import { CheckUrlResponseDto, VersionResponseDto } from '../dtos/parse-response.dto';

/**
 * 链接检查查询处理器
 * 处理链接检查查询，调用领域服务
 */
@Injectable()
export class CheckUrlHandler {
  constructor(private readonly videoParserService: VideoParserService) {}

  /**
   * 处理链接检查查询
   */
  async handle(query: CheckUrlQuery): Promise<CheckUrlResponseDto> {
    const result = await this.videoParserService.checkUrl(query.url);
    
    const response = new CheckUrlResponseDto();
    response.isValid = result.isValid;
    response.platform = result.platform;
    
    return response;
  }
}

/**
 * 版本信息查询处理器
 */
@Injectable()
export class GetVersionHandler {
  /**
   * 处理获取版本信息查询
   */
  async handle(query: GetVersionQuery): Promise<VersionResponseDto> {
    const response = new VersionResponseDto();
    response.version = '1.0.0';
    response.buildTime = new Date().toISOString();
    response.maintainer = 'NestJS开发团队';
    response.description = '抖音无水印视频解析API';
    
    return response;
  }
} 