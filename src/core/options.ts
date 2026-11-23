import { FetchTransport, type Transport } from './http';
import type { Theme } from './types';

export interface Copyright {
  text: string;
  url: string;
  title: string;
}

/** 两种验证码共用的选项；类型特有文案由各包扩展。 */
export interface BaseOptions {
  handleDom: string;
  dataUrl: string;
  checkUrl: string;
  placeholder: string;
  successText: string;
  failText: string;
  showClose: boolean;
  showRefresh: boolean;
  showRipple: boolean;
  theme: Theme;
  inputName: string;
  autoInsertInput: boolean;
  /** 宿主页存在静态守卫 input 时，未通过验证显示的原生提示文案。 */
  guardText: string;
  timeout: number;
  copyright: Copyright;
  transport?: Transport;
}

export const BASE_OPTIONS: BaseOptions = {
  handleDom: '.xq-captcha',
  dataUrl: '/admin/user/captchadata',
  checkUrl: '/admin/user/captchacheck',
  placeholder: '点击按钮进行验证',
  successText: '✓ 验证成功',
  failText: '验证失败，请重试',
  showClose: true,
  showRefresh: true,
  showRipple: true,
  theme: 'auto',
  inputName: 'xq_captcha_token',
  autoInsertInput: true,
  guardText: '请先完成人机验证',
  timeout: 10000,
  copyright: {
    text: '© xqkeji.cn',
    url: 'https://xqkeji.cn/',
    title: 'xqkeji.cn',
  },
};

/** 合并默认值与覆盖项；各包可传入自己的默认文案。 */
export function resolveOptions<T extends BaseOptions>(
  defaults: T,
  overrides: Partial<T> = {},
): T {
  return {
    ...defaults,
    ...overrides,
    copyright: { ...defaults.copyright, ...overrides.copyright },
  };
}

export function createTransport(options: BaseOptions): Transport {
  return options.transport ?? new FetchTransport(options.timeout);
}
