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

  const root = parsed as Record<string, unknown>;

  // xq-app-admin 的检验接口同样可能返回 {code, data:{success,token,message}} 信封。
  // 信封里 token/message 在 data 层；扁平结构则直接在顶层。两种都支持。
  const payload: Record<string, unknown> =
    typeof root.data === 'object' && root.data !== null && !('token' in root) && !('message' in root)
      ? (root.data as Record<string, unknown>)
      : root;

  const success =
    payload.success === true ||
    root.success === true ||
    payload.code === 200 ||
    root.code === 200 ||
    payload.status === 'ok' ||
    root.status === 'ok' ||
    payload.status === 'success' ||
    root.status === 'success';

  return {
    success,
    token: text(payload.token),
    message: text(payload.message) ?? text(payload.error) ?? text(root.message) ?? fallbackMessage,
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