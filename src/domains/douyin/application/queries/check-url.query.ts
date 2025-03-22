/**
 * 链接检查查询
 * 查询模式：获取数据但不修改状态
 */
export class CheckUrlQuery {
  constructor(public readonly url: string) {}
}

/**
 * 获取版本信息查询
 */
export class GetVersionQuery {} 