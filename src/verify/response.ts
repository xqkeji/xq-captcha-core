import { HttpError } from '../core/http';
import type { CheckResult } from '../core/types';

/** 兼容老后端直接返回纯文本的成功标记。 */
const LEGACY_OK = new Set(['ok', '"ok"', 'true', '1']);

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * 规范化检验响应。除标准的 {success,token,message} 外，
 * 还接受 code=200 / status=ok|success，以及纯文本 "ok"。
 */
export function parseCheckResponse(body: string, fallbackMessage: string): CheckResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      success: LEGACY_OK.has(body.trim().toLowerCase()),
      token: null,
      message: fallbackMessage,
    };
  }

  const data = parsed as Record<string, unknown>;

  return {
    success:
      data.success === true ||
      data.code === 200 ||
      data.status === 'ok' ||
      data.status === 'success',
    token: text(data.token),
    message: text(data.message) ?? text(data.error) ?? fallbackMessage,
  };
}

/** 网络/服务器错误转成给用户看的文案。status：-1 超时、0 网络错误。 */
export function failureMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) {
    return fallback;
  }

  if (error.status === -1) {
    return '请求超时，请重试';
  }

  if (error.status === 0) {
    return '网络错误，请检查网络连接';
  }

  try {
    const data: unknown = JSON.parse(error.body);

    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      const message = text(record.message) ?? text(record.error);

      if (message) {
        return message;
      }
    }
  } catch {
    /* 响应体不是 JSON，下面按纯文本截断 */
  }

  return error.body ? error.body.slice(0, 100) : fallback;
}