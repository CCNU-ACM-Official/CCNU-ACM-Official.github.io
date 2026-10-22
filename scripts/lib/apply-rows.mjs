// 「表头 + 行」→ 合并结果。纯函数，不做 IO，方便测试与被两个入口复用。
//
// 三态规则（与 Worker 版一致，全部经由 merge.mjs）：
//   单元格空       → 保持原值
//   单元格写「清空」→ 删除字段
//   单元格有内容   → 覆盖

import { mergeMember, CLEAR } from './merge.mjs';
import { validateMember, } from './validate.mjs';
import { normalizeUrl } from './member.mjs';
import { CLEAR_WORDS, LINK_COLUMNS, mapHeaders } from './rows.mjs';

const FIELD_LABELS = {
  id: 'id',
  enrollYear: '年级',
  name: '昵称',
  title: '头衔',
  org: '学院',
  desc: '个性签名',
  avatar: '头像',
};

export function describeHeaderMapping(headerRow, headerMap) {
  const lines = Object.entries(headerMap).map(([key, index]) => {
    const label = key.startsWith('link:') ? `链接:${key.slice(5)}` : FIELD_LABELS[key];
    return `${headerRow[index]} → ${label}`;
  });
  return lines;
}

/**
 * @param {object} options
 * @param {string[]} options.headerRow
 * @param {string[][]} options.rows
 * @param {Map<string, {file: string, member: object}>} options.members
 * @param {number} [options.lineOffset] 报告里行号的偏移（CSV 有表头）
 */
export function applyRows({ headerRow, rows, members, lineOffset = 1 }) {
  const header = mapHeaders(headerRow);
  const problems = [];

  if (header.name === undefined && header.id === undefined) {
    return {
      header,
      results: [],
      touched: [],
      problems: [`表头里找不到「id」或「昵称」列。识别到的列：${headerRow.join(' | ')}`],
      fatal: true,
    };
  }

  const byNameYear = new Map();
  for (const [id, { member }] of members) {
    byNameYear.set(`${member.enrollYear}::${member.name}`, id);
  }

  const results = [];
  let emptyRows = 0;

  rows.forEach((row, index) => {
    const lineNo = index + 1 + lineOffset;
    const cell = (key) => (header[key] !== undefined ? String(row[header[key]] ?? '').trim() : '');

    // 整行都是空的（新建表格时点出来的空行）→ 静默跳过，不算问题
    const mappedValues = Object.values(header).map((i) => String(row[i] ?? '').trim());
    if (mappedValues.every((value) => value === '')) {
      emptyRows += 1;
      return;
    }

    const rawId = cell('id');
    const rawName = cell('name');
    const rawYear = cell('enrollYear');

    let id = rawId || null;
    if (!id && rawName) {
      const year = Number(rawYear) || null;
      if (year) id = byNameYear.get(`${year}::${rawName}`) ?? null;
      if (!id) {
        const matches = [...members.values()].filter(({ member }) => member.name === rawName);
        if (matches.length === 1) id = matches[0].member.id;
        else if (matches.length > 1) {
          problems.push(
            `第 ${lineNo} 行「${rawName}」重名，请填 id 或年级。候选：${matches.map((m) => m.member.id).join(', ')}`,
          );
          return;
        }
      }
    }

    if (!id || !members.has(id)) {
      problems.push(`第 ${lineNo} 行无法配对到成员（id=${rawId || '空'} 昵称=${rawName || '空'}）`);
      return;
    }

    const patch = {};
    for (const field of ['name', 'title', 'org', 'desc', 'avatar']) {
      const value = cell(field);
      if (!value) continue;
      patch[field] = CLEAR_WORDS.has(value) ? CLEAR : value;
    }

    // 列错位最常见的表现：头像里塞了一个主页链接
    if (patch.avatar && patch.avatar !== CLEAR && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(patch.avatar)) {
      problems.push(`第 ${lineNo} 行（${id}）头像地址不像图片（${patch.avatar}），请检查列是否错位`);
    }

    const linkOps = [];
    for (const platform of Object.keys(LINK_COLUMNS)) {
      const value = cell(`link:${platform}`);
      if (!value) continue;
      if (CLEAR_WORDS.has(value)) {
        linkOps.push({ platform, remove: true });
        continue;
      }
      const url = normalizeUrl(value);
      if (!url) {
        problems.push(`第 ${lineNo} 行 ${platform} 链接不合法：${value}`);
        continue;
      }
      linkOps.push({ platform, url });
    }
    if (linkOps.length) patch.links = linkOps;

    try {
      const before = members.get(id).member;
      const { member, changed } = mergeMember(before, patch);
      if (changed.length === 0) {
        results.push({ id, changed: [], before });
        return;
      }
      const { ok, errors } = validateMember(member);
      if (!ok) {
        problems.push(
          `第 ${lineNo} 行（${id}）合并后不合规：${errors.map((e) => `${e.path} ${e.message}`).join('; ')}`,
        );
        return;
      }
      results.push({ id, changed, member, before, file: members.get(id).file });
    } catch (error) {
      problems.push(`第 ${lineNo} 行（${id}）：${error.message}`);
    }
  });

  return { header, results, touched: results.filter((item) => item.changed.length), problems, emptyRows, fatal: false };
}

const shorten = (value) =>
  value === undefined ? '（无）' : String(value).replace(/\n/g, '⏎').slice(0, 60);

export function renderReport({ headerRow, header, results, touched, problems, emptyRows = 0 }) {
  const lines = [];
  lines.push(`识别到的列：`);
  for (const line of describeHeaderMapping(headerRow, header)) lines.push(`  ${line}`);
  if (header.desc === undefined && header.title === undefined) {
    lines.push('  ⚠ 没识别到「个性签名」或「头衔」列；若表头叫法不同，改 scripts/lib/rows.mjs 里的 HEADER_ALIASES');
  }

  lines.push('');
  lines.push(`解析 ${results.length + problems.length + (emptyRows ?? 0)} 行，可配对 ${results.length} 人，实际有改动 ${touched.length} 人${emptyRows ? `（跳过 ${emptyRows} 个空行）` : ''}。`);
  lines.push('');

  for (const item of results) {
    if (item.changed.length === 0) {
      lines.push(`  ${item.id}  —  无变化`);
      continue;
    }
    lines.push(`  ${item.id}  →  改动字段：${item.changed.join('、')}`);
    for (const field of item.changed) {
      if (field === 'links') {
        lines.push(`      links: ${JSON.stringify(item.before.links ?? [])} → ${JSON.stringify(item.member.links)}`);
      } else {
        lines.push(`      ${field}: ${shorten(item.before[field])} → ${shorten(item.member[field])}`);
      }
    }
  }

  if (problems.length) {
    lines.push('');
    lines.push('需要注意：');
    for (const problem of problems) lines.push(`  ⚠ ${problem}`);
  }

  return lines.join('\n');
}
