import Modal from 'bootstrap/js/dist/modal.js';
import type { Dom } from '../core/dom';

const SHAKE_MS = 500;

export interface ModalHostHooks {
  /** 用户主动关闭（btn-close / ESC / 遮罩）时触发；程序调用 close() 不触发。 */
  onUserClose?(): void;
  /** Bootstrap 过渡结束、弹窗完全显示后触发。 */
  onShown?(): void;
}

/**
 * Bootstrap Modal 的统一封装：显隐、遮罩、ESC、焦点陷阱、body 滚动锁定交给 Modal JS。
 * 组件只保留失败抖动、关闭回调与 shown 回调。
 */
export class ModalHost {
  private instance: Modal | null = null;
  private shakeTimer: number | null = null;
  private hideHandler: (() => void) | null = null;
  private shownHandler: (() => void) | null = null;
  private programmatic = false;

  constructor(
    private readonly dom: Dom,
    private readonly modalSelector: string,
    private readonly contentSelector: string,
    private readonly shakeClass: string,
    private readonly hooks: ModalHostHooks = {},
  ) {}

  get element(): HTMLElement | null {
    return this.dom.queryGlobal(this.modalSelector);
  }

  mount(): void {
    const element = this.element;

    if (!element) {
      return;
    }

    if (this.shownHandler) {
      element.removeEventListener('shown.bs.modal', this.shownHandler);
    }

    this.shownHandler = () => this.hooks.onShown?.();
    element.addEventListener('shown.bs.modal', this.shownHandler);

    if (!this.instance) {
      this.instance = Modal.getOrCreateInstance(element, {
        backdrop: true,
        keyboard: true,
        focus: true,
      });
    }

    if (!this.hideHandler) {
      this.hideHandler = () => {
        if (!this.programmatic) {
          this.hooks.onUserClose?.();
        }
        this.programmatic = false;
      };
      element.addEventListener('hide.bs.modal', this.hideHandler);
    }
  }

  open(): void {
    this.ensureInstance().show();
  }

  close(): void {
    const element = this.element;

    if (!element || !Modal.getInstance(element)) {
      return;
    }

    this.programmatic = true;
    this.instance?.hide();
  }

  setType(type: string): void {
    this.element?.setAttribute('data-xq-captcha-type', type);
  }

  shake(): void {
    const content = this.dom.query(this.contentSelector);

    if (!content) {
      return;
    }

    content.classList.add(this.shakeClass);
    this.clearShakeTimer();
    this.shakeTimer = window.setTimeout(() => {
      content.classList.remove(this.shakeClass);
      this.shakeTimer = null;
    }, SHAKE_MS);
  }

  dispose(): void {
    this.clearShakeTimer();

    const element = this.element;

    if (!element) {
      this.instance = null;
      return;
    }

    if (this.hideHandler) {
      element.removeEventListener('hide.bs.modal', this.hideHandler);
    }
    if (this.shownHandler) {
      element.removeEventListener('shown.bs.modal', this.shownHandler);
    }

    const finalize = (): void => {
      this.instance?.dispose();
      element.remove();
      this.instance = null;
      this.sweepBackdrop();
    };

    if (this.instance && element.classList.contains('show')) {
      element.addEventListener('hidden.bs.modal', finalize, { once: true });
      this.instance.hide();
      window.setTimeout(() => {
        if (this.instance) {
          finalize();
        }
      }, 600);
    } else {
      finalize();
    }
  }

  private ensureInstance(): Modal {
    if (this.instance) {
      return this.instance;
    }

    const element = this.element;
    this.instance = element ? Modal.getOrCreateInstance(element) : (null as unknown as Modal);
    return this.instance;
  }

  private sweepBackdrop(): void {
    if (document.querySelector('.modal.show')) {
      return;
    }

    for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
      backdrop.remove();
    }
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
  }

  private clearShakeTimer(): void {
    if (this.shakeTimer !== null) {
      clearTimeout(this.shakeTimer);
      this.shakeTimer = null;
    }
  }
}
