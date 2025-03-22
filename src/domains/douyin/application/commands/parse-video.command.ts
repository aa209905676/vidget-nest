/**
 * 解析抖音视频命令
 * 命令模式：代表执行的意图，而不是直接执行
 */
export class ParseVideoCommand {
  constructor(public readonly shareUrl: string) {}
}

/**
 * 批量解析抖音视频命令
 */
export class BatchParseVideoCommand {
  constructor(public readonly shareUrls: string[]) {}
} 