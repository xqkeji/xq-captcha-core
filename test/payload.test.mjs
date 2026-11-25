import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckPayload } from '../dist/logic.mjs';

const track = [
  { x: 0, y: 0, t: 0 },
  { x: 12, y: 1, t: 16 },
  { x: 30, y: 3, t: 33 },
];

test('有 challenge_id 时附加到载荷，业务字段原样保留', () => {
  const payload = buildCheckPayload({ offset: 152, track }, '65f3a1b2');

  assert.deepEqual(payload, { offset: 152, track, challenge_id: '65f3a1b2' });
});

test('没有 challenge_id 时完全不出现该字段（灰度旧路径）', () => {
  const payload = buildCheckPayload({ points: [{ x: 1, y: 2, t: 0 }] }, null);

  assert.deepEqual(payload, { points: [{ x: 1, y: 2, t: 0 }] });
  assert.equal('challenge_id' in payload, false);
});

test('空字符串 challenge_id 同样不发送', () => {
  const payload = buildCheckPayload({ offset: 10, track }, '');

  assert.equal('challenge_id' in payload, false);
});

test('永不把 token 带进校验请求', () => {
  const payload = buildCheckPayload({ offset: 10, track, token: 'tk_should_be_dropped' }, 'cid');

  assert.equal('token' in payload, false);
  assert.equal(payload.challenge_id, 'cid');
});

test('不修改调用方传入的对象', () => {
  const input = { offset: 10, track };
  buildCheckPayload(input, 'cid');

  assert.deepEqual(input, { offset: 10, track });
});
