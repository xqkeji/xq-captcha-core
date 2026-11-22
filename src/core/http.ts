/**
 * HTTP 传输层。status 沿用上游语义：-1 超时、0 网络错误、其余为 HTTP 状态码。
 * 抽成接口是为了让演示页能注入本地模拟后端，组件本身不关心请求怎么发出。
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`captcha request failed: ${status}`);
    this.name = 'HttpError';
  }
}

export type HttpMethod = 'GET' | 'POST';

export interface Transport {
  /** 2xx 时 resolve 响应文本，其余情况 reject HttpError。 */
  request(method: HttpMethod, url: string, data?: Record<string, string>): Promise<string>;
}

export class FetchTransport implements Transport {
  constructor(private readonly timeout: number) {}

  async request(method: HttpMethod, url: string, data?: Record<string, string>): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let target = url;
    let body: string | undefined;

    if (data) {
      const params = new URLSearchParams(data).toString();
      if (method === 'GET') {
        target += (url.includes('?') ? '&' : '?') + params;
      } else {
        body = params;
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    try {
      const response = await fetch(target, {
        method,
        body,
        headers,
        signal: controller.signal,
        // 验证码答案存在 PHP 会话里，必须带上同源 Cookie。
        credentials: 'same-origin',
      });
      const text = await response.text();

      if (!response.ok) {
        throw new HttpError(response.status, text);
      }

      return text;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(controller.signal.aborted ? -1 : 0, '');
    } finally {
      clearTimeout(timer);
    }
  }
}