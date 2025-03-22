import { ApiProperty } from '@nestjs/swagger';

/**
 * 视频信息响应DTO
 */
export class VideoInfoResponseDto {
  @ApiProperty({ description: '无水印视频地址' })
  videoUrl: string; // 无水印视频地址
  
  @ApiProperty({ description: '视频封面图' })
  coverUrl: string; // 视频封面图
  
  @ApiProperty({ description: '视频标题' })
  title: string; // 视频标题
  
  @ApiProperty({ description: '作者昵称' })
  author: string; // 作者昵称
  
  @ApiProperty({ description: '视频时长(秒)' })
  duration: number; // 视频时长(秒)
}

/**
 * 批量解析响应DTO
 */
export class BatchVideoInfoResponseDto {
  @ApiProperty({ 
    description: '视频信息列表', 
    type: [VideoInfoResponseDto] 
  })
  videos: VideoInfoResponseDto[];
}

/**
 * 链接检测响应DTO
 */
export class CheckUrlResponseDto {
  @ApiProperty({ description: '链接是否有效' })
  isValid: boolean;
  
  @ApiProperty({ description: '视频平台' })
  platform: string;
}

/**
 * 版本信息响应DTO
 */
export class VersionResponseDto {
  @ApiProperty({ description: '版本号' })
  version: string;
  
  @ApiProperty({ description: '构建时间' })
  buildTime: string;
  
  @ApiProperty({ description: '维护者' })
  maintainer: string;
  
  @ApiProperty({ description: '描述信息' })
  description: string;
}
