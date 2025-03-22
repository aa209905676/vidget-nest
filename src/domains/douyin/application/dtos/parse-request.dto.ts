import { IsNotEmpty, IsString, ArrayNotEmpty } from 'class-validator';

/**
 * 解析单个抖音链接请求DTO
 */
export class ParseVideoRequestDto {
  @IsNotEmpty({ message: '抖音分享链接不能为空' })
  @IsString({ message: '抖音分享链接必须为字符串' })
  shareUrl: string;
}

/**
 * 批量解析抖音链接请求DTO
 */
export class BatchParseVideoRequestDto {
  @ArrayNotEmpty({ message: '抖音分享链接列表不能为空' })
  shareUrls: string[];
}

/**
 * 检查链接请求DTO
 */
export class CheckUrlRequestDto {
  @IsNotEmpty({ message: 'URL不能为空' })
  @IsString({ message: 'URL必须为字符串' })
  url: string;
} 