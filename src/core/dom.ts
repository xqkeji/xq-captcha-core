/**
 * 带缓存的 DOM 查询。
 *
 * 弹窗内部节点限定在各自的 modal 根元素内查询，避免同页存在多个验证码包时
 * 误绑到另一个弹窗的按钮 / 画布 / 提示条；触发器与隐藏输入框属于页面级节点，
 * 走 global 查询。元素脱离文档（re-init / 宿主重建 DOM）时自动重新查询。
 */
export class Dom {
  private readonly cache = new Map<string, Element>();
  private root: ParentNode = document;

  /** 把查询作用域切换到本实例自己的弹窗。 */
  setRoot(root: ParentNode): void {
    if (this.root !== root) {
      this.root = root;
      this.cache.clear();
    }
  }

  /** 弹窗内部节点查询，限定在 setRoot() 指定的作用域内。 */
  query<T extends Element = HTMLElement>(selector: string): T | null {
    const cached = this.cache.get(selector);

    if (cached?.isConnected) {
      return cached as T;
    }

    const found = this.root.querySelector<T>(selector);

    if (found) {
      this.cache.set(selector, found);
    } else {
      this.cache.delete(selector);
    }

    return found;
  }

  queryAll<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(this.root.querySelectorAll<T>(selector));
  }

  /** 页面级节点查询（触发器、弹窗根节点），不受弹窗作用域限制。 */
  queryGlobal<T extends Element = HTMLElement>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  queryAllGlobal<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(document.querySelectorAll<T>(selector));
  }
}
