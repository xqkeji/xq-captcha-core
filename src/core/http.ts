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
  /**
   * 2xx 时 resolve 响应文本，其余情况 reject HttpError。
   * data 允许任意可 JSON 序列化的值（如点选坐标数组），不再限定为字符串。
   */
  request(method: HttpMethod, url: string, data?: Record<string, unknown>): Promise<string>;
}

export class FetchTransport implements Transport {
  constructor(private readonly timeout: number) {}

  async request(method: HttpMethod, url: string, data?: Record<string, unknown>): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let target = url;
    let body: string | undefined;

    if (data) {
      if (method === 'GET') {
        // GET 没有请求体，参数仍拼到 query；非字符串值转成字符串。
        const params = new URLSearchParams(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        ).toString();
        target += (url.includes('?') ? '&' : '?') + params;
      } else {
        // POST 走 JSON 请求体，直接传数组/对象（如 points、slide_track）。
        body = JSON.stringify(data);
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
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