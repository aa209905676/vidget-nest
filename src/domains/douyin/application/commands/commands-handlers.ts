import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ParseVideoCommand, BatchParseVideoCommand } from './parse-video.command';
import { VideoParserService } from '../../domain/services/video-parser.service';
import { VideoInfoResponseDto, BatchVideoInfoResponseDto } from '../dtos/parse-response.dto';

/**
 * 解析单个视频命令处理器
 */
@CommandHandler(ParseVideoCommand)
export class ParseVideoCommandHandler implements ICommandHandler<ParseVideoCommand> {
  constructor(private readonly videoParserService: VideoParserService) {}

  /**
   * 执行命令
   * @param command 解析视频命令
   */
  async execute(command: ParseVideoCommand): Promise<VideoInfoResponseDto> {
    const videoInfo = await this.videoParserService.parseVideo(command.shareUrl);
    
    const response = new VideoInfoResponseDto();
    response.title = videoInfo.title;
    response.author = videoInfo.author;
    response.coverUrl = videoInfo.coverUrl;
    response.videoUrl = videoInfo.videoUrl;
    response.duration = videoInfo.duration;
    
    return response;
  }
}

/**
 * 批量解析视频命令处理器
 */
@CommandHandler(BatchParseVideoCommand)
export class BatchParseVideoCommandHandler implements ICommandHandler<BatchParseVideoCommand> {
  constructor(private readonly videoParserService: VideoParserService) {}

  /**
   * 执行命令
   * @param command 批量解析视频命令
   */
  async execute(command: BatchParseVideoCommand): Promise<BatchVideoInfoResponseDto> {
    const videoInfoList = await this.videoParserService.parseBatchVideos(command.shareUrls);
    
    const response = new BatchVideoInfoResponseDto();
    response.videos = videoInfoList.map(videoInfo => {
      const dto = new VideoInfoResponseDto();
      dto.title = videoInfo.title;
      dto.author = videoInfo.author;
      dto.coverUrl = videoInfo.coverUrl;
      dto.videoUrl = videoInfo.videoUrl;
      dto.duration = videoInfo.duration;
      return dto;
    });
    
    return response;
  }
} 