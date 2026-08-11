export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly title = 'Request failed',
    public readonly type = 'about:blank',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
