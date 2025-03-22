/**
 * 解析单个视频命令
 */
export class ParseVideoCommand {
  constructor(public readonly shareUrl: string) {}
}

/**
 * 批量解析视频命令
 */
export class BatchParseVideoCommand {
  constructor(public readonly shareUrls: string[]) {}
} 