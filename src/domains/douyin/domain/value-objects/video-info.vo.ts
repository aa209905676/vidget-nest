/**
 * 视频信息值对象
 * 作为领域模型中的值对象，不具有身份标识
 * 值对象是不可变的（immutable）
 */
export class VideoInfo {
  constructor(
    public readonly videoUrl: string,
    public readonly coverUrl: string,
    public readonly title: string,
    public readonly author: string,
    public readonly duration: number,
  ) {}

  /**
   * 创建视频信息的工厂方法
   */
  public static create(
    videoUrl: string,
    coverUrl: string,
    title: string,
    author: string,
    duration: number,
  ): VideoInfo {
    return new VideoInfo(
      videoUrl,
      coverUrl,
      title,
      author,
      duration
    );
  }

  /**
   * 从视频实体创建值对象
   */
  public static fromEntity(video: any): VideoInfo {
    return new VideoInfo(
      video.noWatermarkUrl || video.url,
      video.coverUrl,
      video.title,
      video.author,
      video.duration
    );
  }
} 