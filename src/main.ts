import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 配置全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // 配置 CORS
  app.enableCors();
  
  // 配置 Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('Vidget API')
    .setDescription('视频下载工具API文档')
    .setVersion('1.0')
    .addTag('抖音')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用已启动: ${await app.getUrl()}`);
}
bootstrap();
