import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DataClient, BASE_OPTIONS } from '../dist/logic.mjs';

const data = {
  success: true,
  type: 'click',
  image_base64: 'data:image/png;base64,xxx',
  bg_width: 240,
  bg_height: 150,
};

test('DataClient 接受期望 type 的数据', async () => {
  const client = new DataClient(BASE_OPTIONS, { request: async () => JSON.stringify(data) }, 'click');
  assert.deepEqual(await client.load(), data);
});

test('DataClient 接受 type 为 null 的兼容数据', async () => {
  const client = new DataClient(
    BASE_OPTIONS,
    { request: async () => JSON.stringify({ ...data, type: null }) },
    'click',
  );
  assert.equal((await client.load()).type, null);
});

test('type 不匹配时拒绝', async () => {
  const client = new DataClient(BASE_OPTIONS, { request: async () => JSON.stringify(data) }, 'slide');
  await assert.rejects(() => client.load(), /格式不正确/);
});
