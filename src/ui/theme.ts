import type { Dom } from '../core/dom';
import type { Theme as ThemeName } from '../core/types';

/**
 * 主题走 Bootstrap 的 data-bs-theme 属性，不自建色板变量。
 * 只写自己的弹窗根节点，避免同页多个实例互相覆盖页面级主题。
 * modalSelector 由具体包注入。
 */
export class Theme {
  private current: ThemeName = 'auto';
  private media: MediaQueryList | null = null;
  private readonly onSystemChange = (): void => {
    if (this.current === 'auto') {
      this.write(this.resolve());
    }
  };

  constructor(
    private readonly dom: Dom,
    private readonly modalSelector: string,
  ) {}

  apply(theme: ThemeName): void {
    this.current = theme || 'auto';

    if (this.current === 'auto') {
      this.media ??= window.matchMedia('(prefers-color-scheme: dark)');
      this.media.addEventListener('change', this.onSystemChange);
    } else {
      this.media?.removeEventListener('change', this.onSystemChange);
    }

    this.write(this.resolve());
  }

  dispose(): void {
    this.media?.removeEventListener('change', this.onSystemChange);
    this.media = null;
  }

  private resolve(): 'light' | 'dark' {
    if (this.current === 'light' || this.current === 'dark') {
      return this.current;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private write(resolved: 'light' | 'dark'): void {
    this.dom.queryGlobal(this.modalSelector)?.setAttribute('data-bs-theme', resolved);
  }
}
