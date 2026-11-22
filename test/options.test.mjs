import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_OPTIONS, resolveOptions, createTransport, FetchTransport } from '../dist/logic.mjs';

test('默认后端地址与令牌字段名', () => {
  assert.equal(BASE_OPTIONS.dataUrl, '/admin/user/captchadata');
  assert.equal(BASE_OPTIONS.checkUrl, '/admin/user/captchacheck');
  assert.equal(BASE_OPTIONS.inputName, 'xq_captcha_token');
  assert.equal(BASE_OPTIONS.handleDom, '.xq-captcha');
});

test('resolveOptions 合并嵌套 copyright', () => {
  const defaults = { ...BASE_OPTIONS, hintText: '默认提示' };
  const resolved = resolveOptions(defaults, {
    timeout: 3000,
    copyright: { text: '新版权', url: 'https://example.com', title: 't' },
  });
  assert.equal(resolved.timeout, 3000);
  assert.equal(resolved.hintText, '默认提示');
  assert.equal(resolved.copyright.text, '新版权');
});

test('transport 自定义优先于默认 fetch', () => {
  const custom = { request: async () => 'ok' };
  assert.equal(createTransport({ ...BASE_OPTIONS, transport: custom }), custom);
  assert.ok(createTransport(BASE_OPTIONS) instanceof FetchTransport);
});
