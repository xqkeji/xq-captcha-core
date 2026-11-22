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
    const data: unknown = JSON.parse(body);

    if (!isValidData(data, this.expectedType)) {
      throw new Error('验证码数据格式不正确');
    }

    return data;
  }
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
