import type { Transport } from '../core/http';
import type { BaseOptions } from '../core/options';
import type { CheckResult } from '../core/types';
import { failureMessage, parseCheckResponse } from './response';

export interface SubmitOutcome {
  onSuccess(result: CheckResult): void;
  onFailure(message: string): void;
}

/**
 * 上报检验结果。type 特有的 payload 由各包在调用 submit() 时传入，
 * 参数名沿用 xq-app-admin 契约（click_points / captcha_r / slide_track）。
 */
export class Submitter {
  constructor(
    private readonly options: BaseOptions,
    private readonly transport: Transport,
    private readonly outcome: SubmitOutcome,
  ) {}

  submit(data: Record<string, string>): void {
    this.transport
      .request('POST', this.options.checkUrl, data)
      .then((body) => this.outcome.onSuccess(parseCheckResponse(body, this.options.failText)))
      .catch((error: unknown) => {
        this.outcome.onFailure(failureMessage(error, this.options.failText));
      });
  }
}
