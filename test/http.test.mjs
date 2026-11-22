import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FetchTransport, HttpError } from '../dist/logic.mjs';

function mockFetch(responder) {
  return (...args) => Promise.resolve(responder(...args));
}

test('GET 把 data 拼到 query', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch((url, init) => {
    calls.push({ url, init });
    return { ok: true, text: async () => 'done' };
  });
  try {
    const transport = new FetchTransport(1000);
    const out = await transport.request('GET', '/data', { a: '1', b: '2' });
    assert.equal(out, 'done');
    assert.equal(calls[0].url, '/data?a=1&b=2');
    assert.equal(calls[0].init.credentials, 'same-origin');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST 把 data 放 body 且带表单 Content-Type', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch((url, init) => {
    calls.push(init);
    return { ok: true, text: async () => 'ok' };
  });
  try {
    const transport = new FetchTransport(1000);
    await transport.request('POST', '/check', { captcha_r: '10' });
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].body, 'captcha_r=10');
    assert.equal(calls[0].headers['Content-Type'], 'application/x-www-form-urlencoded');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('非 2xx 抛 HttpError 并带响应体', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(() => ({ ok: false, status: 422, text: async () => 'bad' }));
  try {
    const transport = new FetchTransport(1000);
    await assert.rejects(
      () => transport.request('GET', '/data'),
      (err) => err instanceof HttpError && err.status === 422 && err.body === 'bad',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
