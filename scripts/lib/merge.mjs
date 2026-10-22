// 表单输入 → 数据文件的合并规约。这是「没填的字段保持原值」的唯一实现，
// Worker 与离线脚本都调用它，避免两套逻辑跑偏。
//
// 输入里每个字段有三种状态：
//   undefined / 缺省   → 保持不变
//   CLEAR             → 删除该字段
//   其他值             → 覆盖（先归一化、再校验）

import { descToPlain, normalizeUrl, PLATFORMS } from './member.mjs';

export const CLEAR = '__CLEAR__';

/** 表单里允许成员自己改的字段。其余（id / enrollYear / hidden）不接受直接写入。 */
export const EDITABLE_FIELDS = ['name', 'title', 'org', 'desc', 'avatar', 'links', 'email'];

const TEXT_LIMITS = {
  name: 32,
  title: 60,
  org: 40,
  desc: 400,
};

function normalizeText(value, field) {
  const limit = TEXT_LIMITS[field];
  // 统一换行、去掉控制字符（保留 \n）、压缩多余空白
  const text = String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
  if (text.length > limit) {
    throw new Error(`${field} 超长：${text.length} > ${limit}`);
  }
  return text;
}

/** 列表字段（links）按平台增量合并：只覆盖提到的那条。 */
function mergeLinks(existing, input) {
  const current = Array.isArray(existing) ? [...existing] : [];
  const incoming = Array.isArray(input) ? input : [];

  for (const item of incoming) {
    const platform = String(item?.platform ?? '').trim();
    if (!PLATFORMS.includes(platform)) {
      throw new Error(`未知平台: ${platform}`);
    }

    const index = current.findIndex((entry) => entry.platform === platform);

    // 显式删除：{ platform, remove: true }
    if (item?.remove === true) {
      if (index !== -1) current.splice(index, 1);
      continue;
    }

    const url = normalizeUrl(item?.url);
    if (!url) {
      throw new Error(`链接不合法: ${String(item?.url ?? '')}`);
    }

    if (index === -1) current.push({ platform, url });
    else current[index] = { platform, url };
  }

  return current;
}

/**
 * @param {object} existing 现有数据（迁移后的形状）
 * @param {object} input    来自表单的部分字段
 * @returns {{member: object, changed: string[]}} 新数据 + 实际发生变化的字段名
 */
export function mergeMember(existing, input) {
  const next = structuredClone(existing);
  const changed = [];

  for (const field of ['name', 'title', 'org', 'desc', 'avatar']) {
    const raw = input?.[field];
    if (raw === undefined) continue;

    if (raw === CLEAR) {
      if (next[field] !== undefined) {
        delete next[field];
        changed.push(field);
      }
      continue;
    }

    const value = field === 'desc' ? descToPlain(normalizeText(raw, field)) : normalizeText(raw, field);
    if (value === '' || value === (next[field] ?? '')) continue;
    next[field] = value;
    changed.push(field);
  }

  if (input?.links !== undefined) {
    const merged = mergeLinks(existing.links, input.links);
    if (JSON.stringify(merged) !== JSON.stringify(existing.links ?? [])) {
      next.links = merged;
      changed.push('links');
    }
  }

  // 展示字段之外的东西不接受外部写入
  delete next.email;

  if (changed.length > 0) {
    next.updatedAt = new Date().toISOString();
  }

  return { member: next, changed };
}
