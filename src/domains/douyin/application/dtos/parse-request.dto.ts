import { IsNotEmpty, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 解析单个抖音链接请求DTO
 */
export class ParseVideoRequestDto {
  @ApiProperty({
    description: '抖音分享链接',
    example: 'https://v.douyin.com/i53txDso/',
  })
  @IsNotEmpty({ message: '抖音分享链接不能为空' })
  @IsString({ message: '抖音分享链接必须为字符串' })
  url: string;
}

/**
 * 批量解析抖音链接请求DTO
 */
export class BatchParseVideoRequestDto {
  @ApiProperty({
    description: '抖音分享链接列表',
    example: ['https://v.douyin.com/i53txDso/'],
    type: [String],
  })
  @ArrayNotEmpty({ message: '抖音分享链接列表不能为空' })
  shareUrls: string[];
}

/**
 * 检查链接请求DTO
 */
export class CheckUrlRequestDto {
  @ApiProperty({
    description: '需要检查的URL',
    example: 'https://v.douyin.com/i53txDso/',
  })
  @IsNotEmpty({ message: 'URL不能为空' })
  @IsString({ message: 'URL必须为字符串' })
  url: string;
} 