import type { Transport } from './http';
import type { BaseOptions } from './options';
import type { CaptchaData, CaptchaType } from './types';

/** 两个包只有期望的 captcha type 不同；由构造参数注入。 */
export class DataClient {
  constructor(
    private readonly options: BaseOptions,
    private readonly transport: Transport,
    private readonly expectedType: CaptchaType,
  ) {}

  async load(): Promise<CaptchaData> {
    const body = await this.transport.request('GET', this.options.dataUrl);
    const parsed: unknown = JSON.parse(body);
    const data = unwrap(parsed);

    if (!isValidData(data, this.expectedType)) {
      // 失败信封（如限流 code=203）里的 message 比「格式不正确」有用得多，优先透传。
      throw new Error(errorMessage(parsed) ?? '验证码数据格式不正确');
    }

    return data;
  }
}

/** 非成功响应里的可展示文案；成功信封返回 null。 */
function errorMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const root = value as Record<string, unknown>;

  if (root.code === 200 || root.success === true) {
    return null;
  }

  return typeof root.message === 'string' && root.message !== '' ? root.message : null;
}

/**
 * 兼容两种生成接口返回结构：
 * 1. 扁平的 CaptchaData（历史契约 / 演示 mock）：{success, type, image_base64, ...}
 * 2. xq-app-admin 的统一信封：{code: 200, data: {type, image_base64, ...}}
 *    信封没有 success 字段，成功与否由顶层 code 表达，这里补成 success: boolean。
 *
 * 只在顶层确实是信封时才解包：顶层有 data 对象、且顶层自身不是有效 CaptchaData
 * （没有 image_base64），避免误伤扁平结构。
 */
function unwrap(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const root = value as Record<string, unknown>;
  const payload = root.data;

  if (typeof payload !== 'object' || payload === null || typeof root.image_base64 === 'string') {
    return value;
  }

  // 信封只有在 code=200（或显式 success=true）时才算有效载荷。
  // 非成功信封一律保留原样（无 success 字段），由 isValidData 拒绝，
  // 避免把失败响应里残留的 image_base64 当成可绘制数据。
  if (root.code !== 200 && root.success !== true) {
    return value;
  }

  return {
    ...(payload as Record<string, unknown>),
    success: true,
  };
}

function isValidData(data: unknown, expectedType: CaptchaType): data is CaptchaData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as CaptchaData).success === 'boolean' &&
    ((data as CaptchaData).type === expectedType || (data as CaptchaData).type === null) &&
    typeof (data as CaptchaData).image_base64 === 'string'
  );
}
