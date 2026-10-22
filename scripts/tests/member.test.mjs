import { test } from 'node:test';
import assert from 'node:assert/strict';

import { descToPlain, plainToSafeHtml, detectPlatform, makeId, parseId, normalizeUrl } from '../lib/member.mjs';
import { validateMember } from '../lib/validate.mjs';

const SECRET = 'test-secret-0123456789abcdef';

const base = {
  schemaVersion: 1,
  id: '2024-001',
  enrollYear: 2024,
  name: 'yfffftuifuy',
  title: 'ICPC金 / 清华硕',
  org: '计算机学院',
  desc: '第一行\n第二行',
  avatar: '/avatar/zouzhuoang.jpg',
  links: [{ platform: 'codeforces', url: 'https://codeforces.com/profile/zouzhuoang' }],
  hidden: false,
};

test('desc: <br/> 降级为换行，标签被剥掉', () => {
  assert.equal(descToPlain('a<br/>b<br>c'), 'a\nb\nc');
  assert.equal(descToPlain('<script>alert(1)</script>嗨'), 'alert(1)嗨');
  assert.equal(descToPlain('  \n\n x  \n\n\n'), 'x');
});

test('desc: 渲染 HTML 时先转义再还原换行（XSS 载荷只会变成文本）', () => {
  const html = plainToSafeHtml('<script>alert(1)</script>\n第二行');
  assert.equal(html, '&lt;script&gt;alert(1)&lt;/script&gt;<br/>第二行');
  assert.ok(!html.includes('<script'));
});

test('desc: 转义 + 还原后可逆，多行签名不会被压平', () => {
  assert.equal(plainToSafeHtml(descToPlain('一<br/>二')), '一<br/>二');
});

test('platform: 按域名识别', () => {
  assert.equal(detectPlatform('https://codeforces.com/profile/x'), 'codeforces');
  assert.equal(detectPlatform('https://www.luogu.com.cn/user/123'), 'luogu');
  assert.equal(detectPlatform('https://atcoder.jp/users/x'), 'atcoder');
  assert.equal(detectPlatform('https://example.com/x'), 'other');
  assert.equal(detectPlatform('不是链接'), 'other');
});

test('id: 年份 + 三位顺序号', () => {
  assert.equal(makeId(2024, 1), '2024-001');
  assert.equal(makeId(2024, 123), '2024-123');
  assert.deepEqual(parseId('2024-007'), { year: 2024, seq: 7 });
  assert.equal(parseId('2024-7'), null);
  assert.throws(() => makeId(2024, 1000));
});

test('url: 补协议、拒绝非 http(s)', () => {
  assert.equal(normalizeUrl('codeforces.com/profile/x'), 'https://codeforces.com/profile/x');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('data:text/html,<script>'), null);
});

test('validate: 迁移后的基线条目合法', () => {
  const result = validateMember(base);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('validate: id 与 enrollYear 必须自洽', () => {
  const result = validateMember({ ...base, enrollYear: 2023 });
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /不一致/);
});

test('validate: 含尖括号的签名被拒绝（守住 v-html 的边界）', () => {
  const result = validateMember({ ...base, desc: '<img src=x onerror=alert(1)>' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.path === 'desc'));
});

test('validate: 头像只接受本地路径或 https', () => {
  assert.equal(validateMember({ ...base, avatar: 'http://evil/x.png' }).ok, false);
  assert.equal(validateMember({ ...base, avatar: '/avatar/x.png' }).ok, true);
});

