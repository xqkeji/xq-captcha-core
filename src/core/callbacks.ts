import type { CallbackMap, CallbackName } from './types';

/**
 * 类型安全的回调注册表。回调抛错只记录日志，不影响组件主流程。
 * logPrefix 由具体包传入（xq-click-captcha / xq-slide-captcha）。
 */
export class Callbacks {
  private readonly handlers = new Map<CallbackName, (...args: never[]) => void>();

  constructor(private readonly logPrefix: string) {}

  set<K extends CallbackName>(name: K, fn: CallbackMap[K]): void {
    this.handlers.set(name, fn as (...args: never[]) => void);
  }

  emit<K extends CallbackName>(name: K, ...args: Parameters<CallbackMap[K]>): void {
    const fn = this.handlers.get(name);

    if (!fn) {
      return;
    }

    try {
      (fn as (...args: Parameters<CallbackMap[K]>) => void)(...args);
    } catch (error) {
      console.error(`${this.logPrefix}: ${name} 回调抛出异常`, error);
    }
  }
}
