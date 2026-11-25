/**
 * 领域类型。与 xq-app-admin 后端返回的字段一一对应。
 */

export type CaptchaType = 'slide' | 'click';

export type Theme = 'auto' | 'light' | 'dark';

/** 滑动轨迹点：x/y 为图片像素，t 为相对拖动起点的毫秒数。 */
export interface TrackPoint {
  x: number;
  y: number;
  t: number;
}

/** 点击点：x/y 为图片像素，t 为相对首次点击的毫秒数。 */
export interface ClickPoint {
  x: number;
  y: number;
  t: number;
}

/** 生成接口（dataUrl）返回。 */
export interface CaptchaData {
  success: boolean;
  type: CaptchaType | null;
  image_base64: string;
  bg_width: number;
  bg_height: number;
  mark_width?: number;
  mark_height?: number;
  pos_y?: number;
  char_count?: number;
  hint?: string;
  message?: string;
  /**
   * 本轮图片的挑战标识。服务端按它保存答案，校验时带回即可只比对这一轮；
   * 不传时服务端退回「按会话存一份」的旧路径。
   */
  challenge_id?: string;
}

/** 检验接口（checkUrl）返回的规范化结果。 */
export interface CheckResult {
  success: boolean;
  token: string | null;
  message: string;
}

export interface CallbackMap {
  success: (token: string | null) => void;
  fail: (message: string) => void;
  close: () => void;
  show: () => void;
  hide: () => void;
  refresh: (type: CaptchaType, switched: boolean) => void;
  reset: () => void;
}

export type CallbackName = keyof CallbackMap;