import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { DouyinModule } from './domains/douyin/douyin.module';

/**
 * 主应用模块
 * 整合所有功能模块
 */
@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),

    // 缓存模块
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 1000, // 1小时（毫秒）
    }),

    // 功能模块
    DouyinModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
