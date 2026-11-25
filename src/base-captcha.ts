import { Callbacks } from './core/callbacks';
import { DataClient } from './core/data-client';
import { Dom } from './core/dom';
import { createTransport, resolveOptions, type BaseOptions } from './core/options';
import { State } from './core/state';
import type { CaptchaData, CaptchaType, CheckResult, Theme as ThemeName } from './core/types';
import type { Transport } from './core/http';
import { HiddenInput } from './ui/hidden-input';
import { Message, type MessageSelectors } from './ui/message';
import { ModalHost } from './ui/modal-host';
import { Theme } from './ui/theme';
import { Trigger, type TriggerClasses } from './ui/trigger';
import { Submitter, type SubmitOutcome } from './verify/submitter';
import { buildCheckPayload } from './verify/payload';

const SUCCESS_HIDE_MS = 2000;
const FAIL_REFRESH_MS = 1200;
export const FORM_ERROR_EVENT = 'xq.form.error';

export interface CaptchaHooks {
  logPrefix: string;
  type: CaptchaType;
  defaultOptions: BaseOptions;
  modalSelector: string;
  contentSelector: string;
  shakeClass: string;
  messageSelectors: MessageSelectors;
  triggerClasses: TriggerClasses;
  triggerSelector: string;
  /** 是否由 Modal 的 hide.bs.modal 上报用户主动关闭（点选包用 data-bs-dismiss，需要；滑动包自己绑关闭按钮，不需要）。 */
  useModalCloseHook?: boolean;
}

/** 基类注入给类型特有行为的共享上下文。 */
export interface CaptchaContext {
  dom: Dom;
  state: State;
  options: BaseOptions;
  type: CaptchaType;
  /** 提交类型特有 payload 到检验接口（值可为数组/数字等可 JSON 序列化的类型）。
   *  challenge_id 由基类自动附加，行为子类不需要关心。 */
  submit(data: Record<string, unknown>): void;
  /** 上报 refresh 回调。 */
  emitRefresh(): void;
}

/**
 * 类型特有行为。基类只做通用编排，所有与画布 / 交互 / 标记有关的动作
 * 都由此接口注入，确保重构不改变原有行为顺序。
 */
export abstract class CaptchaBehaviour {
  /** 由基类在构造时注入，子类所有方法都通过它访问共享状态。 */
  protected ctx!: CaptchaContext;

  bindContext(ctx: CaptchaContext): void {
    this.ctx = ctx;
    this.onContextReady();
  }

  /** 上下文就绪后创建依赖 state/dom 的内部组件。 */
  protected onContextReady(): void {}

  abstract buildModal(options: BaseOptions): HTMLElement;
  abstract attachInteraction(): void;
  abstract detachInteraction(): void;

  /** show() 时重置交互（点选清空标记，滑动挂起并归零滑块）。 */
  abstract resetForShow(): void;
  /** hide() 时中止进行中的交互（滑动挂起拖动/键盘提交）。 */
  abstract suspendInteraction(): void;
  /** refresh() 时重置画布/图层并显示 loading。 */
  abstract prepareRefresh(): void;
  /** 应用后端数据（绘制画布、更新状态、隐藏 loading）。 */
  abstract applyData(data: CaptchaData): Promise<void>;
  /** 失败反馈（点选标记错误点）。 */
  abstract markFailures(): void;
  /** 失败后自动换图前的额外清理（点选清空点击点）。 */
  abstract beforeFailRefresh(): void;
  /** 弹窗完全显示后（滑动需重新测量画布）。 */
  onModalShown?(): void;
  /** 数据/图片加载失败时把 loading 切换为错误态（不自动刷新）。 */
  onDataError?(): void;
}

/**
 * 点选 / 滑动验证码共用的门面编排。
 * 公开 API 全部在此实现，类型差异由 CaptchaBehaviour 注入。
 */
export abstract class BaseCaptcha {
  protected readonly options: BaseOptions;
  protected readonly dom: Dom;
  protected readonly state: State;
  protected readonly callbacks: Callbacks;

  protected readonly modal: ModalHost;
  protected readonly message: Message;
  protected readonly theme: Theme;
  protected readonly trigger: Trigger;
  protected readonly hiddenInput: HiddenInput;
  protected dataClient: DataClient;
  protected submitter: Submitter;
  private transport: Transport;

  private successHideTimer: number | null = null;
  private failRefreshTimer: number | null = null;
  private formErrorHandler: ((event: Event) => void) | null = null;
  /** 出图请求序号：双击 init / 重复 refresh 时只认最后一次，避免旧图配新 challenge_id。 */
  private refreshSeq = 0;

  private readonly outcome: SubmitOutcome = {
    onSuccess: (result) => this.handleSuccess(result),
    onFailure: (message) => this.handleFail(message),
  };

  constructor(
    protected readonly behaviour: CaptchaBehaviour,
    protected readonly hooks: CaptchaHooks,
    options: Partial<BaseOptions> = {},
  ) {
    this.options = resolveOptions(hooks.defaultOptions, options);
    this.dom = new Dom();
    this.state = new State(hooks.type);
    this.callbacks = new Callbacks(hooks.logPrefix);

    behaviour.bindContext({
      dom: this.dom,
      state: this.state,
      options: this.options,
      type: hooks.type,
      submit: (data) => this.submit(data),
      emitRefresh: () => this.emitRefresh(),
    });

    this.modal = new ModalHost(
      this.dom,
      hooks.modalSelector,
      hooks.contentSelector,
      hooks.shakeClass,
      {
        onUserClose: hooks.useModalCloseHook
          ? () => {
              this.callbacks.emit('close');
              this.callbacks.emit('hide');
            }
          : undefined,
        onShown: () => this.behaviour.onModalShown?.(),
      },
    );
    this.message = new Message(this.dom, hooks.messageSelectors);
    this.theme = new Theme(this.dom, hooks.modalSelector);
    this.trigger = new Trigger(
      this.dom,
      this.options,
      hooks.triggerClasses,
      hooks.triggerSelector,
    );
    this.trigger.setSuccessStyle(hooks.type === 'click');
    this.hiddenInput = new HiddenInput(this.dom, this.options);

    this.transport = createTransport(this.options);
    this.dataClient = new DataClient(this.options, this.transport, hooks.type);
    this.submitter = new Submitter(this.options, this.transport, this.outcome);
  }

  init(options?: Partial<BaseOptions>): this {
    if (options) {
      Object.assign(this.options, resolveOptions(this.hooks.defaultOptions, options));
      this.transport = createTransport(this.options);
      this.dataClient = new DataClient(this.options, this.transport, this.hooks.type);
      this.submitter = new Submitter(this.options, this.transport, this.outcome);
    }

    this.dom.setRoot(this.behaviour.buildModal(this.options));
    this.modal.mount();
    this.theme.apply(this.options.theme);
    this.modal.setType(this.hooks.type);

    this.behaviour.attachInteraction();
    this.bindTools();
    this.trigger.bind(() => this.show());
    this.bindFormError();
    this.hiddenInput.mount();

    return this;
  }

  /** 类型特有工具按钮绑定（滑动包还需绑定关闭按钮）。 */
  protected bindTools(): void {}

  /** 绑定到弹窗内按钮，避免重复绑定。 */
  protected bindButton(selector: string, action: () => void, attr = 'xqCaptchaBound'): void {
    const node = this.dom.query<HTMLElement>(selector);

    if (!node || node.dataset[attr] === '1') {
      return;
    }

    node.dataset[attr] = '1';
    node.addEventListener('click', action);
  }

  show(): void {
    this.clearTimers();
    this.state.beginRound();
    this.behaviour.resetForShow();
    this.hiddenInput.block();
    this.trigger.showPlaceholder();
    this.message.hideOk();

    this.modal.open();
    this.refresh();
    this.callbacks.emit('show');
  }

  hide(): void {
    this.behaviour.suspendInteraction();
    this.modal.close();
    this.callbacks.emit('hide');
  }

  refresh(): void {
    this.clearFailTimer();
    // beginRefresh 会清掉 challengeId：旧图对应的 id 不能再用于新图。
    this.state.beginRefresh();
    this.behaviour.prepareRefresh();

    const seq = ++this.refreshSeq;

    this.dataClient
      .load()
      .then((data) => {
        // 期间又发起了新的刷新，这一轮的结果作废（否则会出现旧图配新 id）。
        if (seq !== this.refreshSeq) {
          return;
        }

        // challenge_id 必须和「这次要画的图」同步落库，不能等到图片解码完再写。
        this.state.challengeId = data.challenge_id ?? null;

        return this.behaviour.applyData(data);
      })
      .catch((error: unknown) => {
        if (seq !== this.refreshSeq) {
          return;
        }

        console.error(`${this.hooks.logPrefix}: 获取验证码失败`, error);
        // 数据解析/请求失败时 applyData 不会被调用，loading 会一直转。
        // 这里给出可见反馈并置回未通过守卫；不自动刷新，避免后端持续失败时死循环。
        this.behaviour.onDataError?.();
        const reason = error instanceof Error ? error.message : this.options.failText;
        this.message.show(reason, false);
        this.state.busy = false;
        this.state.passed = false;
        this.state.token = null;
        this.state.challengeId = null;
        this.hiddenInput.block();
        this.callbacks.emit('fail', reason);
      });
  }

  reset(): this {
    this.hide();
    this.clearTimers();
    this.state.beginRound();
    this.hiddenInput.block();
    this.trigger.showPlaceholder();
    this.refresh();
    this.callbacks.emit('reset');
    return this;
  }

  result(): boolean {
    return this.state.passed;
  }

  getToken(): string | null {
    return this.state.token;
  }

  getCaptchaType(): CaptchaType {
    return this.state.type;
  }

  setTheme(theme: ThemeName): this {
    this.options.theme = theme || 'auto';
    this.theme.apply(this.options.theme);
    return this;
  }

  onSuccess(fn: (token: string | null) => void): this {
    this.callbacks.set('success', fn);
    return this;
  }

  onFail(fn: (message: string) => void): this {
    this.callbacks.set('fail', fn);
    return this;
  }

  onClose(fn: () => void): this {
    this.callbacks.set('close', fn);
    return this;
  }

  onShow(fn: () => void): this {
    this.callbacks.set('show', fn);
    return this;
  }

  onHide(fn: () => void): this {
    this.callbacks.set('hide', fn);
    return this;
  }

  onRefresh(fn: (type: CaptchaType, switched: boolean) => void): this {
    this.callbacks.set('refresh', fn);
    return this;
  }

  onReset(fn: () => void): this {
    this.callbacks.set('reset', fn);
    return this;
  }

  dispose(): void {
    this.clearTimers();
    this.behaviour.detachInteraction();
    this.trigger.detach();
    this.message.dispose();
    this.theme.dispose();
    this.modal.dispose();
    this.hiddenInput.dispose();

    if (this.formErrorHandler) {
      document.removeEventListener(FORM_ERROR_EVENT, this.formErrorHandler);
      this.formErrorHandler = null;
    }
  }

  protected submit(data: Record<string, unknown>): void {
    this.submitter.submit(buildCheckPayload(data, this.state.challengeId));
  }

  protected emitRefresh(): void {
    this.callbacks.emit('refresh', this.hooks.type, false);
  }

  protected handleSuccess(result: CheckResult): void {
    this.state.busy = false;
    this.state.passed = true;

    if (result.token) {
      this.state.token = result.token;
    }

    this.trigger.showSuccess();
    this.message.show(this.options.successText, true);

    this.hiddenInput.sync(this.getToken());

    this.clearSuccessTimer();
    this.successHideTimer = window.setTimeout(() => {
      this.successHideTimer = null;
      this.hide();
    }, SUCCESS_HIDE_MS);

    this.callbacks.emit('success', this.getToken());
  }

  protected handleFail(message: string): void {
    this.state.busy = false;
    this.state.passed = false;
    this.state.token = null;
    // 202 一律视为本轮作废：清掉 challenge_id，下面的定时器会重新拉图拿新 id。
    // 不要拿旧 id 重试，服务端会把过期 id 判成「验证码已过期，请刷新重试」。
    this.state.challengeId = null;
    this.hiddenInput.block();

    this.behaviour.markFailures();
    this.modal.shake();
    this.message.show(message, false);
    this.trigger.showFail();
    this.callbacks.emit('fail', message);

    this.clearFailTimer();
    this.failRefreshTimer = window.setTimeout(() => {
      this.failRefreshTimer = null;
      this.behaviour.beforeFailRefresh();
      this.state.busy = false;
      this.refresh();
    }, FAIL_REFRESH_MS);
  }

  private bindFormError(): void {
    if (this.formErrorHandler) {
      return;
    }

    this.formErrorHandler = (event) => {
      const form = event.target;

      if (!(form instanceof Element) || !form.querySelector(this.options.handleDom)) {
        return;
      }

      try {
        this.reset();
      } catch (error) {
        console.error(`${this.hooks.logPrefix}: 表单失败复位异常`, error);
      }
    };

    document.addEventListener(FORM_ERROR_EVENT, this.formErrorHandler);
  }

  private clearTimers(): void {
    this.clearSuccessTimer();
    this.clearFailTimer();
  }

  private clearSuccessTimer(): void {
    if (this.successHideTimer !== null) {
      clearTimeout(this.successHideTimer);
      this.successHideTimer = null;
    }
  }

  private clearFailTimer(): void {
    if (this.failRefreshTimer !== null) {
      clearTimeout(this.failRefreshTimer);
      this.failRefreshTimer = null;
    }
  }
}
