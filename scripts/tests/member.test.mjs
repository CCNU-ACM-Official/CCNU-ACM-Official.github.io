import { test } from 'node:test';
import assert from 'node:assert/strict';

import { descToPlain, plainToSafeHtml, detectPlatform, makeId, parseId, normalizeUrl } from '../lib/member.mjs';
import { mergeMember, CLEAR } from '../lib/merge.mjs';
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

test('merge: 没填的字段保持原值（AC1）', () => {
  const { member, changed } = mergeMember(base, { desc: '新的签名' });
  assert.equal(member.desc, '新的签名');
  assert.equal(member.name, base.name);
  assert.equal(member.org, base.org);
  assert.equal(member.title, base.title);
  assert.deepEqual(member.links, base.links);
  assert.deepEqual(changed, ['desc']);
});

test('merge: 提交与现状相同 → 无变化（AC3 幂等）', () => {
  const { changed } = mergeMember(base, { desc: base.desc, name: base.name });
  assert.deepEqual(changed, []);
});

test('merge: CLEAR 真的能清空（AC3）', () => {
  const { member, changed } = mergeMember(base, { desc: CLEAR });
  assert.equal('desc' in member, false);
  assert.deepEqual(changed, ['desc']);
});

test('merge: links 按平台增量，不碰其它平台', () => {
  const existing = {
    ...base,
    links: [
      { platform: 'codeforces', url: 'https://codeforces.com/profile/x' },
      { platform: 'luogu', url: 'https://www.luogu.com.cn/user/1' },
    ],
  };
  const { member } = mergeMember(existing, { links: [{ platform: 'github', url: 'https://github.com/x' }] });
  assert.equal(member.links.length, 3);
  assert.deepEqual(
    member.links.map((l) => l.platform),
    ['codeforces', 'luogu', 'github'],
  );

  const removed = mergeMember(existing, { links: [{ platform: 'luogu', remove: true }] }).member;
  assert.deepEqual(
    removed.links.map((l) => l.platform),
    ['codeforces'],
  );
});

test('merge: 不接受外部写入 id / enrollYear / hidden / email', () => {
  const { member } = mergeMember(base, { id: '1999-999', enrollYear: 1999, hidden: true, email: 'a@b.c' });
  assert.equal(member.id, base.id);
  assert.equal(member.enrollYear, base.enrollYear);
  assert.equal(member.hidden, base.hidden);
  assert.equal('email' in member, false);
});

test('merge: 超长与非法链接抛错，不会写入脏数据', () => {
  assert.throws(() => mergeMember(base, { desc: 'x'.repeat(401) }), /超长/);
  assert.throws(() => mergeMember(base, { links: [{ platform: 'codeforces', url: 'javascript:alert(1)' }] }), /不合法/);
  assert.throws(() => mergeMember(base, { links: [{ platform: 'weibo', url: 'https://x.com' }] }), /未知平台/);
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

