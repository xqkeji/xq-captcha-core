import type { Dom } from '../core/dom';
import type { BaseOptions } from '../core/options';

export interface TriggerClasses {
  /** 呼吸点类名（点选包为 xq-captcha-pulse，滑动包为 xq-captcha-ripple）。 */
  ripple: string;
  /** 验证通过类名（点选包走 btn-success，滑动包走 xq-captcha-verified）。 */
  verified: string;
}

/**
 * 触发按钮。页面上可以有多个，全部同步到同一状态；外观交给 Bootstrap btn。
 * 类型差异通过 classes 配置注入，页面级节点查询走 queryAllGlobal。
 */
export class Trigger {
  private readonly bound = new Set<HTMLElement>();
  private handler: (() => void) | null = null;

  constructor(
    private readonly dom: Dom,
    private readonly options: BaseOptions,
    private readonly classes: TriggerClasses,
    private readonly triggerSelector: string,
  ) {}

  bind(onOpen: () => void): void {
    // init 每次传入的都是新闭包；先解绑旧的，否则 detach 会移除错的那个。
    this.detach();
    this.handler = onOpen;

    for (const node of this.nodes()) {
      node.classList.add('btn', 'btn-outline-primary');
      this.render(node, this.options.placeholder, this.options.showRipple);
      this.bound.add(node);
      node.addEventListener('click', onOpen);
    }
  }

  detach(): void {
    if (this.handler) {
      for (const node of this.bound) {
        node.removeEventListener('click', this.handler);
      }
    }

    this.bound.clear();
    this.handler = null;
  }

  showPlaceholder(): void {
    this.renderAll(this.options.placeholder, this.options.showRipple);
  }

  showSuccess(): void {
    this.renderAll(this.options.successText, false);
  }

  showFail(): void {
    this.renderAll(this.options.failText, false);
  }

  /** 成功后是否使用 btn-success（点选包 true，滑动包用自定义 verified 类）。 */
  setSuccessStyle(useBtnSuccess: boolean): void {
    this.useBtnSuccess = useBtnSuccess;
  }

  private useBtnSuccess = false;

  private renderAll(text: string, ripple: boolean): void {
    for (const node of this.nodes()) {
      this.render(node, text, ripple);
    }
  }

  private render(node: HTMLElement, text: string, ripple: boolean): void {
    node.textContent = text;
    node.classList.remove(this.classes.verified, 'btn-success');
    node.classList.toggle(this.classes.ripple, ripple);

    if (this.useBtnSuccess) {
      node.classList.add('btn-success');
      node.classList.remove('btn-outline-primary');
    }
  }

  private nodes(): HTMLElement[] {
    return this.dom.queryAllGlobal<HTMLElement>(this.options.handleDom || this.triggerSelector);
  }
}
