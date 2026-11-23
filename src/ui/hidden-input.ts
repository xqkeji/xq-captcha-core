import type { Dom } from '../core/dom';
import type { BaseOptions } from '../core/options';

/**
 * 令牌字段与原生表单守卫。
 *
 * 两种模式：
 * 1. 守卫模式：宿主页在触发器所属表单内静态写好同名 input（type=text +
 *    visually-hidden）。组件保留该元素，用 setCustomValidity 控制表单能否提交：
 *    未通过时给出提示并拦截，通过后清空提示并写入令牌。
 * 2. 回退模式：页面没有静态守卫元素时，维持旧行为——动态创建 type=hidden
 *    输入框，通过增删元素表达通过状态（不参与 HTML5 验证）。
 *
 * 查找与写入限定在触发器所属表单内，避免同页多个验证码实例共用默认
 * inputName（xq_captcha_token）时互相串写。
 */
export class HiddenInput {
  private form: HTMLFormElement | null = null;
  private guard: HTMLInputElement | null = null;
  private fallback: HTMLInputElement | null = null;

  constructor(
    private readonly dom: Dom,
    private readonly options: BaseOptions,
  ) {}

  /** 初始化：解析目标元素，并把守卫设为“未通过”状态以拦截提交。 */
  mount(): void {
    this.resolve();
    this.block();
  }

  /**
   * 未通过验证：守卫模式下写入自定义提示让浏览器拦截提交；
   * 回退模式下移除动态字段，保持原有无令牌语义。
   */
  block(): void {
    if (this.guard) {
      this.guard.value = '';
      this.guard.setCustomValidity(this.guardText());
    } else if (this.fallback) {
      this.fallback.remove();
      this.fallback = null;
    }
  }

  /**
   * 验证通过：守卫模式下清空提示放行并写入令牌；回退模式下动态插入字段。
   * backend_only 无令牌时，守卫只放行不写值，回退模式不插入字段。
   */
  sync(token: string | null): void {
    if (this.guard) {
      this.guard.value = token ?? '';
      this.guard.setCustomValidity('');
      return;
    }

    const name = this.options.inputName;
    if (!name || !token || !this.options.autoInsertInput) {
      return;
    }

    if (!this.fallback) {
      const trigger = this.dom.queryGlobal<HTMLElement>(this.options.handleDom);
      if (!trigger) {
        return;
      }
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = token;
      this.fallback = input;

      if (this.form) {
        this.form.append(input);
      } else {
        trigger.parentNode?.insertBefore(input, trigger.nextSibling);
      }
      return;
    }

    this.fallback.value = token;
  }

  /** 销毁时：清空守卫提示并移除动态字段，不删除宿主的静态元素。 */
  dispose(): void {
    if (this.guard) {
      this.guard.value = '';
      this.guard.setCustomValidity('');
      this.guard = null;
    }
    this.fallback?.remove();
    this.fallback = null;
    this.form = null;
  }

  /** 兼容旧调用：等同 block()，保留 remove 方法名避免外部破坏。 */
  remove(): void {
    this.block();
  }

  /** 在触发器所属表单内解析静态守卫元素；找不到则不启用守卫模式。 */
  private resolve(): void {
    const name = this.options.inputName;
    if (!name) {
      return;
    }

    const trigger = this.dom.queryGlobal<HTMLElement>(this.options.handleDom);
    if (trigger) {
      this.form = trigger.closest('form');
    }

    const scope: ParentNode = this.form ?? document;
    const candidate = scope.querySelector<HTMLInputElement>(
      `input[name="${CSS.escape(name)}"]`,
    );

    // type=hidden 不参与 HTML5 约束验证，不当作守卫元素。
    if (candidate && candidate.type !== 'hidden') {
      this.guard = candidate;
    }
  }

  private guardText(): string {
    return this.guard?.dataset.xqGuardText || this.options.guardText;
  }
}
