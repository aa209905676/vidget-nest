/**
 * 视频实体类
 * 作为领域模型中的聚合根，代表抖音视频
 */
export class Video {
  private readonly _id: string;
  private _url: string;
  private _title: string;
  private _author: string;
  private _coverUrl: string;
  private _duration: number;
  private _noWatermarkUrl: string | null = null;

  constructor(
    id: string,
    url: string,
    title: string,
    author: string,
    coverUrl: string,
    duration: number,
  ) {
    this._id = id;
    this._url = url;
    this._title = title;
    this._author = author;
    this._coverUrl = coverUrl;
    this._duration = duration;
  }

  /**
   * 为视频设置无水印地址
   * 领域逻辑：处理无水印URL的生成
   */
  public setNoWatermarkUrl(url: string): void {
    this._noWatermarkUrl = url.replace('playwm', 'play')
      .replace('aweme.snssdk.com', 'aweme.amemv.com');
  }

  public isProcessed(): boolean {
    return this._noWatermarkUrl !== null;
  }

  // 访问器属性
  get id(): string {
    return this._id;
  }

  get url(): string {
    return this._url;
  }

  get title(): string {
    return this._title;
  }

  get author(): string {
    return this._author;
  }

  get coverUrl(): string {
    return this._coverUrl;
  }

  get duration(): number {
    return this._duration;
  }

  get noWatermarkUrl(): string | null {
    return this._noWatermarkUrl;
  }
} 