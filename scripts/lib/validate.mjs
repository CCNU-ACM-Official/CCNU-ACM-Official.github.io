// 成员数据的校验器。Worker（写入前）与 CI（构建前）调用同一份，
// 保证"能写进仓库的"与"能通过 CI 的"是同一套标准。

import { PLATFORMS, parseId } from './member.mjs';

const LIMITS = { name: 32, title: 60, org: 40, desc: 400, sponsor: 120, avatar: 200 };

// 这些字段最终会进入 v-html（desc）或直接拼进属性，含尖括号一律拒绝。
// 数据层守住这条，渲染层才有资格做转义还原换行。
const HTML_UNSAFE = /[<>]/;

const ALLOWED_KEYS = new Set([
  'schemaVersion',
  'id',
  'enrollYear',
  'name',
  'title',
  'org',
  'desc',
  'avatar',
  'sponsor',
  'links',
  'hidden',
  'updatedAt',
]);

// 头像既可以是仓库内的 /avatar/xxx（历史上出现过 Liu,Yaowei.jpg、小念.png 这类名字），
// 也可以是 https 外链；重点是不含引号/尖括号/空白，且不能向上跳目录。
const AVATAR_PATTERN = /^(\/avatar\/[^\s"'<>\\]+|https:\/\/[^\s"'<>]+)$/;

function checkText(errors, member, field, { required = false } = {}) {
  const value = member[field];
  if (value === undefined) {
    if (required) errors.push({ path: field, message: '必填' });
    return;
  }
  if (typeof value !== 'string') {
    errors.push({ path: field, message: '必须是字符串' });
    return;
  }
  const limit = LIMITS[field] ?? 200;
  if (value.length > limit) {
    errors.push({ path: field, message: `超长（${value.length} > ${limit}）` });
  }
  if (required && value.trim() === '') {
    errors.push({ path: field, message: '不能为空' });
  }
  if (HTML_UNSAFE.test(value)) {
    errors.push({ path: field, message: '不允许包含 < 或 >' });
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) {
    errors.push({ path: field, message: '包含控制字符' });
  }
}

/**
 * @param {unknown} member
 * @returns {{ok: boolean, errors: {path: string, message: string}[], warnings: string[]}}
 */
export function validateMember(member) {
  const errors = [];
  const warnings = [];

  if (!member || typeof member !== 'object' || Array.isArray(member)) {
    return { ok: false, errors: [{ path: '$', message: '必须是对象' }], warnings };
  }

  for (const key of Object.keys(member)) {
    if (!ALLOWED_KEYS.has(key)) warnings.push(`未知字段 ${key}（会被忽略）`);
  }

  if (member.schemaVersion !== 1) {
    errors.push({ path: 'schemaVersion', message: '必须为 1' });
  }

  const parsed = parseId(member.id);
  if (!parsed) {
    errors.push({ path: 'id', message: '格式必须是 YYYY-NNN' });
  } else if (member.enrollYear !== parsed.year) {
    errors.push({ path: 'enrollYear', message: `与 id 的年份不一致（id 是 ${parsed.year}）` });
  }

  if (!Number.isInteger(member.enrollYear) || member.enrollYear < 2010 || member.enrollYear > 2100) {
    errors.push({ path: 'enrollYear', message: '必须是 2010–2100 的整数' });
  }

  checkText(errors, member, 'name', { required: true });
  checkText(errors, member, 'title');
  checkText(errors, member, 'org');
  checkText(errors, member, 'desc');
  checkText(errors, member, 'sponsor');

  if (member.avatar !== undefined) {
    if (typeof member.avatar !== 'string' || !AVATAR_PATTERN.test(member.avatar)) {
      errors.push({ path: 'avatar', message: '必须是 /avatar/xxx 本地路径或 https:// 地址' });
    } else if (member.avatar.includes('..')) {
      errors.push({ path: 'avatar', message: '不允许出现 ..' });
    }
  }

  if (member.links !== undefined) {
    if (!Array.isArray(member.links)) {
      errors.push({ path: 'links', message: '必须是数组' });
    } else {
      if (member.links.length > 8) errors.push({ path: 'links', message: '最多 8 条' });
      const seen = new Set();
      member.links.forEach((item, index) => {
        const at = `links[${index}]`;
        if (!item || typeof item !== 'object') {
          errors.push({ path: at, message: '必须是对象' });
          return;
        }
        if (!PLATFORMS.includes(item.platform)) {
          errors.push({ path: `${at}.platform`, message: `必须是 ${PLATFORMS.join(' / ')} 之一` });
        } else if (item.platform !== 'other') {
          if (seen.has(item.platform)) errors.push({ path: `${at}.platform`, message: `重复的 ${item.platform}` });
          seen.add(item.platform);
        }
        if (typeof item.url !== 'string' || !/^https?:\/\/\S+$/.test(item.url)) {
          errors.push({ path: `${at}.url`, message: '必须是 http(s) 绝对地址' });
        }
        if (item.remove !== undefined) {
          errors.push({ path: `${at}.remove`, message: 'remove 只用于提交，不应落盘' });
        }
      });
    }
  }

  if (member.hidden !== undefined && typeof member.hidden !== 'boolean') {
    errors.push({ path: 'hidden', message: '必须是布尔值' });
  }

  if (member.updatedAt !== undefined && Number.isNaN(Date.parse(member.updatedAt))) {
    errors.push({ path: 'updatedAt', message: '必须是 ISO 时间' });
  }

  return { ok: errors.length === 0, errors, warnings };
}
