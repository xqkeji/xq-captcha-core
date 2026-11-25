/** 纯逻辑入口：不依赖 DOM / Bootstrap，可在 Node 中直接测试。 */
export { Callbacks } from './core/callbacks';
export { DataClient } from './core/data-client';
export { Dom } from './core/dom';
export { FetchTransport, HttpError } from './core/http';
export type { HttpMethod, Transport } from './core/http';
export { BASE_OPTIONS, createTransport, resolveOptions } from './core/options';
export type { BaseOptions, Copyright } from './core/options';
export { State } from './core/state';
export type {
  CallbackMap,
  CallbackName,
  CaptchaData,
  CaptchaType,
  CheckResult,
  ClickPoint,
  Theme,
  TrackPoint,
} from './core/types';
export { failureMessage, parseCheckResponse } from './verify/response';
export { buildCheckPayload } from './verify/payload';
export { Submitter } from './verify/submitter';
export type { SubmitOutcome } from './verify/submitter';
