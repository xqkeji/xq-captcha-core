import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCheckResponse, failureMessage } from '../dist/logic.mjs';
import { HttpError } from '../dist/logic.mjs';

test('标准 success/token/message 响应', () => {
  assert.deepEqual(
    parseCheckResponse('{"success":true,"token":"tk_1","message":"通过"}', '兜底'),
    { success: true, token: 'tk_1', message: '通过' },
  );
});

test('兼容 code=200 / status=ok / error 字段', () => {
  assert.equal(parseCheckResponse('{"code":200}', '兜底').success, true);
  assert.equal(parseCheckResponse('{"status":"ok"}', '兜底').success, true);
  assert.equal(parseCheckResponse('{"success":false,"error":"错了"}', '兜底').message, '错了');
});

test('兼容 {code,data} 信封，从 data 层取 token/message', () => {
  assert.deepEqual(
    parseCheckResponse(
      '{"code":200,"data":{"success":true,"token":"tk_env","message":"通过"}}',
      '兜底',
    ),
    { success: true, token: 'tk_env', message: '通过' },
  );
  assert.equal(
    parseCheckResponse('{"code":500,"data":{"success":false,"message":"答错了"}}', '兜底').success,
    false,
  );
});

test('纯文本 legacy ok', () => {
  assert.equal(parseCheckResponse('OK', '兜底').success, true);
  assert.equal(parseCheckResponse('nope', '兜底').success, false);
});

test('token 缺失时为 null，message 缺失时用兜底', () => {
  const r = parseCheckResponse('{"success":true}', '兜底文案');
  assert.equal(r.token, null);
  assert.equal(r.message, '兜底文案');
});

test('failureMessage 区分超时/网络/服务端消息', () => {
  assert.equal(failureMessage(new HttpError(-1, ''), '兜底'), '请求超时，请重试');
  assert.equal(failureMessage(new HttpError(0, ''), '兜底'), '网络错误，请检查网络连接');
  assert.equal(
    failureMessage(new HttpError(500, '{"message":"服务器炸了"}'), '兜底'),
    '服务器炸了',
  );
  assert.equal(failureMessage(new Error('other'), '兜底'), '兜底');
});
