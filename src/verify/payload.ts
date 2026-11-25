/**
 * 校验载荷组装。单独成文件是为了能在 Node 里直接测（不依赖 DOM）。
 */

/**
 * 给校验载荷挂上本轮的 challenge_id。
 *
 * 两条硬约束：
 * 1. 没有 challenge_id 时**不加**这个字段 —— 服务端保留旧路径，缺字段要退回会话存储的灰度行为。
 * 2. 永远不带 token —— 服务端是 dual 模式，captchacheck 一旦收到 token 就会走令牌二次校验
 *    并把令牌消费掉，后续表单提交必然失败。token 只能由校验成功的响应下发。
 */
export function buildCheckPayload(
  data: Record<string, unknown>,
  challengeId: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };

  delete payload.token;

  if (challengeId) {
    payload.challenge_id = challengeId;
  }

  return payload;
}
