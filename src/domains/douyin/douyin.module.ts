import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';

// 接口层
import { DouyinController } from './interfaces/controllers/douyin.controller';

// 应用层 - 命令和查询处理器
import { ParseVideoHandler } from './application/handlers/parse-video.handler';
import { CheckUrlHandler, GetVersionHandler } from './application/handlers/check-url.handler';
import { ParseVideoCommandHandler, BatchParseVideoCommandHandler } from './application/commands/commands-handlers';

// 领域层 - 服务
import { VideoParserService } from './domain/services/video-parser.service';

// 基础设施层 - 仓储和客户端
import { ApiVideoRepository } from './infrastructure/repositories/api-video.repository';
import { DouyinApiClient } from './infrastructure/http/douyin-api.client';

// 命令和查询处理器列表
const CommandHandlers = [ParseVideoCommandHandler, BatchParseVideoCommandHandler];
const QueryHandlers = [CheckUrlHandler, GetVersionHandler];

// 领域服务列表
const DomainServices = [VideoParserService];

// 基础设施服务列表
const InfrastructureServices = [
  ApiVideoRepository,
  DouyinApiClient,
];

/**
 * 抖音模块
 * 整合所有抖音相关功能
 */
@Module({
  imports: [
    CqrsModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [DouyinController],
  providers: [
    // 命令和查询处理器
    ...CommandHandlers,
    ...QueryHandlers,
    
    // 领域服务
    ...DomainServices,
    
    // 基础设施服务
    ...InfrastructureServices,
    
    // 仓储提供者
    {
      provide: 'IVideoRepository',
      useClass: ApiVideoRepository,
    },
  ],
  exports: [VideoParserService],
})
export class DouyinModule {} 