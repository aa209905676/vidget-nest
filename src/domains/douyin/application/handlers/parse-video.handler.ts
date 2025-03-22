import { Injectable } from '@nestjs/common';
import { VideoParserService } from '../../domain/services/video-parser.service';
import {
  ParseVideoCommand,
  BatchParseVideoCommand,
} from '../commands/parse-video.command';
import {
  VideoInfoResponseDto,
  BatchVideoInfoResponseDto,
} from '../dtos/parse-response.dto';

/**
 * 解析视频命令处理器
 * 处理解析视频的命令，调用领域服务
 */
@Injectable()
export class ParseVideoHandler {
  constructor(private readonly videoParserService: VideoParserService) {}

  /**
   * 处理解析视频命令
   */
  async handle(command: ParseVideoCommand): Promise<VideoInfoResponseDto> {
    const videoInfo = await this.videoParserService.parseVideo(
      command.shareUrl,
    );

    const response = new VideoInfoResponseDto();
    response.videoUrl = videoInfo.videoUrl;
    response.coverUrl = videoInfo.coverUrl;
    response.title = videoInfo.title;
    response.author = videoInfo.author;
    response.duration = videoInfo.duration;

    return response;
  }

  /**
   * 处理批量解析视频命令
   */
  async handleBatch(
    command: BatchParseVideoCommand,
  ): Promise<BatchVideoInfoResponseDto> {
    const videoInfoList = await this.videoParserService.parseBatchVideos(
      command.shareUrls,
    );

    const response = new BatchVideoInfoResponseDto();
    response.videos = videoInfoList.map((videoInfo) => {
      const dto = new VideoInfoResponseDto();
      dto.videoUrl = videoInfo.videoUrl;
      dto.coverUrl = videoInfo.coverUrl;
      dto.title = videoInfo.title;
      dto.author = videoInfo.author;
      dto.duration = videoInfo.duration;
      return dto;
    });

    return response;
  }
}
