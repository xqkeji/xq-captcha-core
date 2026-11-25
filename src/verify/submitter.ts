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
 * 基类再补上本轮的 challenge_id，统一以 JSON 请求体提交（points / offset / track）。
 */
export class Submitter {
  constructor(
    private readonly options: BaseOptions,
    private readonly transport: Transport,
    private readonly outcome: SubmitOutcome,
  ) {}

  submit(data: Record<string, unknown>): void {
    this.transport
      .request('POST', this.options.checkUrl, data)
      .then((body) => {
        const result = parseCheckResponse(body, this.options.failText);

        // 业务校验失败（HTTP 200 但 success=false）必须走失败分支，
        // 否则会把错误的点选/滑动判为通过并放行表单守卫。
        if (result.success) {
          this.outcome.onSuccess(result);
        } else {
          this.outcome.onFailure(result.message || this.options.failText);
        }
      })
      .catch((error: unknown) => {
        this.outcome.onFailure(failureMessage(error, this.options.failText));
      });
  }
}
