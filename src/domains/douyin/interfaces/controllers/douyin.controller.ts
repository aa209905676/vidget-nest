import { Controller, Post, Body, Get, Query, HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ParseVideoCommand, BatchParseVideoCommand } from '../../application/commands/parse-video.command';
import { CheckUrlQuery, GetVersionQuery } from '../../application/queries/check-url.query';
import { 
  ParseVideoRequestDto, 
  BatchParseVideoRequestDto, 
  CheckUrlRequestDto 
} from '../../application/dtos/parse-request.dto';
import {
  VideoInfoResponseDto,
  BatchVideoInfoResponseDto,
  CheckUrlResponseDto,
  VersionResponseDto
} from '../../application/dtos/parse-response.dto';

/**
 * 抖音控制器
 * 接口层，负责处理HTTP请求，将其转换为命令和查询
 */
@ApiTags('抖音')
@Controller('douyin')
export class DouyinController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * 解析单个抖音视频链接
   */
  @ApiOperation({ summary: '解析抖音视频' })
  @ApiResponse({ status: 200, description: '解析成功', type: VideoInfoResponseDto })
  @ApiResponse({ status: 400, description: '无效的请求参数' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @Post('parse')
  async parseVideo(
    @Body(new ValidationPipe({ transform: true })) dto: ParseVideoRequestDto,
  ): Promise<VideoInfoResponseDto> {
    try {
      const command = new ParseVideoCommand(dto.shareUrl);
      return await this.commandBus.execute(command);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `解析视频失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量解析抖音视频链接
   */
  @ApiOperation({ summary: '批量解析抖音视频' })
  @ApiResponse({ status: 200, description: '解析成功', type: BatchVideoInfoResponseDto })
  @ApiResponse({ status: 400, description: '无效的请求参数' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @Post('batch-parse')
  async batchParseVideos(
    @Body(new ValidationPipe({ transform: true })) dto: BatchParseVideoRequestDto,
  ): Promise<BatchVideoInfoResponseDto> {
    try {
      const command = new BatchParseVideoCommand(dto.shareUrls);
      return await this.commandBus.execute(command);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `批量解析视频失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 检查URL是否为有效的抖音链接
   */
  @ApiOperation({ summary: '检查URL是否为有效的抖音链接' })
  @ApiResponse({ status: 200, description: '检查成功', type: CheckUrlResponseDto })
  @ApiResponse({ status: 400, description: '无效的请求参数' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @Post('check-url')
  async checkUrl(
    @Body(new ValidationPipe({ transform: true })) dto: CheckUrlRequestDto,
  ): Promise<CheckUrlResponseDto> {
    try {
      const query = new CheckUrlQuery(dto.url);
      return await this.queryBus.execute(query);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `检查URL失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取版本信息
   */
  @ApiOperation({ summary: '获取版本信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: VersionResponseDto })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @Get('version')
  async getVersion(): Promise<VersionResponseDto> {
    try {
      const query = new GetVersionQuery();
      return await this.queryBus.execute(query);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `获取版本信息失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 