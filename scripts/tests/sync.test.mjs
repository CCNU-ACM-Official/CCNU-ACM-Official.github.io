// L3（飞书定时拉取）的测试：单元格归一化、矩阵拼装、以及用假 fetch
// 跑一遍"拿 token → 分页读记录 → 合并"的完整路径。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeFeishuCell, feishuRecordsToMatrix, CLEAR_WORDS } from '../lib/rows.mjs';
import { applyRows, renderReport } from '../lib/apply-rows.mjs';
import { getTenantToken, listRecords } from '../lib/feishu.mjs';

const base = {
  schemaVersion: 1,
  id: '2024-001',
  enrollYear: 2024,
  name: 'yfffftuifuy',
  title: 'ICPC金 / 清华硕',
  org: '计算机学院',
  desc: '原签名',
  avatar: '/avatar/zouzhuoang.jpg',
  links: [{ platform: 'codeforces', url: 'https://codeforces.com/profile/zouzhuoang' }],
  hidden: false,
};

function membersMap(...entries) {
  const map = new Map();
  for (const member of entries) map.set(member.id, { file: `${member.id}.json`, member });
  return map;
}

test('飞书单元格：文本段数组 / 超链接对象 / 单选字符串 / 数字', () => {
  assert.equal(normalizeFeishuCell([{ type: 'text', text: '烧冻鸡翅' }]), '烧冻鸡翅');
  assert.equal(normalizeFeishuCell({ link: 'https://codeforces.com/profile/x', text: '主页' }), 'https://codeforces.com/profile/x');
  assert.equal(normalizeFeishuCell('计算机学院'), '计算机学院');
  assert.equal(normalizeFeishuCell(2024), '2024');
  assert.equal(normalizeFeishuCell(null), '');
  assert.equal(normalizeFeishuCell([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]), 'ab');
});

test('飞书记录 → 矩阵：列名取并集，缺列不会让整行错位', () => {
  const records = [
    { fields: { id: '2024-001', 昵称: 'a' } },
    { fields: { id: '2024-002', 昵称: 'b', 个性签名: 'x' } },
  ];
  const { headerRow, rows } = feishuRecordsToMatrix(records);
  assert.deepEqual(headerRow, ['id', '昵称', '个性签名']);
  assert.deepEqual(rows, [
    ['2024-001', 'a', ''],
    ['2024-002', 'b', 'x'],
  ]);
});

test('飞书记录 → 矩阵：指定列顺序时以指定为准', () => {
  const records = [{ fields: { 昵称: 'a', id: '2024-001' } }];
  const { headerRow } = feishuRecordsToMatrix(records, ['id', '昵称']);
  assert.deepEqual(headerRow, ['id', '昵称']);
});

test('合并：只填了昵称的行，其它字段一个都不许动', () => {
  const members = membersMap(base);
  const { results, touched, problems } = applyRows({
    headerRow: ['id', '昵称'],
    rows: [['2024-001', '改名了']],
    members,
  });
  assert.deepEqual(problems, []);
  assert.equal(touched.length, 1);
  const merged = touched[0].member;
  assert.equal(merged.name, '改名了');
  assert.equal(merged.desc, base.desc);
  assert.equal(merged.title, base.title);
  assert.deepEqual(merged.links, base.links);
  assert.deepEqual(results[0].changed, ['name']);
});

test('合并：值为「清空」才删字段；同日重复提交幂等', () => {
  const members = membersMap(base);
  const cleared = applyRows({
    headerRow: ['id', '个性签名'],
    rows: [['2024-001', '清空']],
    members,
  });
  assert.equal('desc' in cleared.touched[0].member, false);

  const fresh = membersMap(base);
  const again = applyRows({
    headerRow: ['id', '昵称'],
    rows: [['2024-001', base.name]],
    members: fresh,
  });
  assert.equal(again.touched.length, 0);
});

test('合并：配对失败与重名都会报出来，且不动数据', () => {
  const dup1 = { ...base, id: '2024-001', name: '同名' };
  const dup2 = { ...base, id: '2024-002', name: '同名' };
  const members = membersMap(dup1, dup2);

  const { touched, problems } = applyRows({
    headerRow: ['昵称'],
    rows: [['同名'], ['查无此人']],
    members,
  });
  assert.equal(touched.length, 0);
  assert.ok(problems.some((p) => p.includes('重名')));
  assert.ok(problems.some((p) => p.includes('无法配对')));
});

test('合并：列错位把主页链接塞进头像，会被警告', () => {
  const members = membersMap(base);
  const { problems } = applyRows({
    headerRow: ['id', '头像'],
    rows: [['2024-001', 'https://codeforces.com/profile/x']],
    members,
  });
  assert.ok(problems.some((p) => p.includes('头像地址不像图片')));
});

test('报告里会打印列映射，列错位一眼可见', () => {
  const members = membersMap(base);
  const headerRow = ['id', '昵称', '洛谷'];
  const result = applyRows({ headerRow, rows: [['2024-001', 'a', '']], members });
  const report = renderReport({ headerRow, ...result });
  assert.match(report, /id → id/);
  assert.match(report, /洛谷 → 链接:luogu/);
});

test('飞书客户端：拿到 token 并能翻页读完所有记录', async () => {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (String(url).includes('tenant_access_token')) {
      return {
        json: async () => ({ code: 0, tenant_access_token: 't-abc', expire: 7200 }),
      };
    }
    const pageToken = new URL(String(url)).searchParams.get('page_token');
    return {
      json: async () =>
        pageToken
          ? { code: 0, data: { items: [{ fields: { id: '2024-002' } }], has_more: false } }
          : { code: 0, data: { items: [{ fields: { id: '2024-001' } }], has_more: true, page_token: 'p2' } },
    };
  };

  const token = await getTenantToken({ appId: 'id', appSecret: 'sec', fetchImpl: fakeFetch });
  assert.equal(token, 't-abc');

  const records = await listRecords({ token, appToken: 'app', tableId: 'tbl', fetchImpl: fakeFetch });
  assert.equal(records.length, 2);
  assert.equal(calls.filter((c) => c.url.includes('/records')).length, 2);
});

test('飞书客户端：权限不足时报错带可操作的提示', async () => {
  const fakeFetch = async () => ({ json: async () => ({ code: 1254005, msg: 'FieldNameNotFound' }) });
  await assert.rejects(
    () => listRecords({ token: 't', appToken: 'a', tableId: 'b', fetchImpl: fakeFetch }),
    /协作者/,
  );
});

test('清空词表包含中文与英文写法', () => {
  assert.ok(CLEAR_WORDS.has('清空'));
  assert.ok(CLEAR_WORDS.has('CLEAR'));
});

// ---------- 头像附件 ----------

test('附件识别：只有 file_token 数组算附件', async () => {
  const { isAttachmentCell, pickExtension } = await import('../lib/attachments.mjs');
  assert.equal(isAttachmentCell([{ file_token: 'abc', name: 'a.jpg' }]), true);
  assert.equal(isAttachmentCell([{ text: 'x' }]), false);
  assert.equal(isAttachmentCell('https://x/a.jpg'), false);
  assert.equal(pickExtension({ type: 'image/png', name: 'a.png' }), 'png');
  assert.equal(pickExtension({ name: 'noext' }), 'jpg');
});

test('头像附件：下载后替换成站内路径，文件名用 id', async () => {
  const { resolveAvatarAttachments } = await import('../lib/attachments.mjs');
  const written = {};
  const records = [
    { fields: { id: '2024-001', 头像: [{ file_token: 'ft1', name: 'a.png', type: 'image/png', size: 10 }] } },
  ];
  const outcome = await resolveAvatarAttachments({
    records,
    avatarColumns: ['头像'],
    token: 't',
    getId: (f) => f.id,
    fetchImpl: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }),
    writeAvatar: async (name, bytes) => { written[name] = bytes.length; },
  });
  assert.deepEqual(outcome.saved, ['2024-001 → /avatar/2024-001.png']);
  assert.equal(written['2024-001.png'], 3);
  assert.equal(records[0].fields['头像'], '/avatar/2024-001.png');
});

test('头像附件：超过 2MB 跳过，不下载', async () => {
  const { resolveAvatarAttachments } = await import('../lib/attachments.mjs');
  let called = false;
  const records = [
    { fields: { id: '2024-002', 头像: [{ file_token: 'ft2', name: 'big.jpg', size: 3 * 1024 * 1024 }] } },
  ];
  const outcome = await resolveAvatarAttachments({
    records,
    avatarColumns: ['头像'],
    token: 't',
    getId: (f) => f.id,
    fetchImpl: async () => { called = true; return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; },
    writeAvatar: async () => {},
  });
  assert.equal(called, false);
  assert.equal(outcome.saved.length, 0);
  assert.match(outcome.skipped[0], /2MB/);
});

test('头像附件：下载 403 时给出权限提示', async () => {
  const { resolveAvatarAttachments } = await import('../lib/attachments.mjs');
  const records = [{ fields: { id: '2024-003', 头像: [{ file_token: 'ft3', name: 'c.jpg', size: 100 }] } }];
  const outcome = await resolveAvatarAttachments({
    records,
    avatarColumns: ['头像'],
    token: 't',
    getId: (f) => f.id,
    fetchImpl: async () => ({ ok: false, status: 403 }),
    writeAvatar: async () => {},
  });
  assert.match(outcome.skipped[0], /下载云文档文件/);
});
