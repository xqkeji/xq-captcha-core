import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Submitter } from '../dist/logic.mjs';

function harness(responder) {
  const calls = { success: [], failure: [] };
  const transport = { request: responder };
  const options = { checkUrl: '/check', failText: '验证失败，请重试' };
  const outcome = {
    onSuccess: (result) => calls.success.push(result),
    onFailure: (message) => calls.failure.push(message),
  };
  return { calls, submitter: new Submitter(options, transport, outcome) };
}

test('业务 success=false 走 onFailure，不误判为通过', async () => {
  const { calls, submitter } = harness(() =>
    Promise.resolve(JSON.stringify({ success: false, token: null, message: '验证失败，请重试' })),
  );
  submitter.submit({ captcha_r: '0' });
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(calls.success.length, 0);
  assert.deepEqual(calls.failure, ['验证失败，请重试']);
});

test('业务 success=true 走 onSuccess 并携带 token', async () => {
  const { calls, submitter } = harness(() =>
    Promise.resolve(JSON.stringify({ success: true, token: 'tk_123', message: 'ok' })),
  );
  submitter.submit({ captcha_r: '100' });
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(calls.failure.length, 0);
  assert.equal(calls.success.length, 1);
  assert.equal(calls.success[0].token, 'tk_123');
  assert.equal(calls.success[0].success, true);
});

test('网络异常走 onFailure', async () => {
  const { calls, submitter } = harness(() => Promise.reject(new Error('network')));
  submitter.submit({ captcha_r: '1' });
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(calls.success.length, 0);
  assert.deepEqual(calls.failure, ['验证失败，请重试']);
});
