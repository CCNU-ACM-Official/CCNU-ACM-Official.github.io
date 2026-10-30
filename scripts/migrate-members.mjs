#!/usr/bin/env node
// 把 docs/协会成员.md 里的 members<YYYY> 数组迁移成 docs/_data/members/<id>.json。
//
//   node scripts/migrate-members.mjs                        # 默认读 docs/协会成员.md
//   node scripts/migrate-members.mjs --from <path>          # 指定来源
//   node scripts/migrate-members.mjs --out <dir>            # 指定输出
//   node scripts/migrate-members.mjs --dry-run              # 只报告不落盘
//
// 迁移遵循两条原则：
//   1. desc 由 HTML 降级为纯文本（<br/> → \n），渲染层再转义回 <br/>，视觉不变；
//   2. links 丢掉内联 icon.svg，只留 platform + url，图标交给渲染层查表。

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findNamedArrays } from './lib/js-literal.mjs';
import { descToPlain, detectPlatform, makeId, normalizeUrl } from './lib/member.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { from: 'docs/协会成员.md', out: 'docs/_data/members', counters: 'docs/_data/counters', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--from') args.from = argv[++i];
    else if (flag === '--out') args.out = argv[++i];
    else if (flag === '--counters') args.counters = argv[++i];
    else throw new Error(`未知参数: ${flag}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const sourcePath = resolve(root, args.from);
if (!existsSync(sourcePath)) {
  console.error(`找不到来源文件: ${sourcePath}`);
  process.exit(1);
}

const content = await readFile(sourcePath, 'utf8');
const groups = findNamedArrays(content, 'members');
if (groups.length === 0) {
  console.error('没有在文件里找到任何 members<YYYY> 数组。');
  process.exit(1);
}

const warnings = [];
const stats = {
  groups: 0,
  members: 0,
  perYear: {},
  hosts: {},
  platforms: {},
  maxDescLength: 0,
  maxNameLength: 0,
  maxOrgLength: 0,
  longestDescId: null,
  noLinks: 0,
  noName: 0,
  duplicateNames: [],
  droppedLinks: 0,
  normalizedLinks: 0,
};

const members = [];

for (const group of groups) {
  stats.groups += 1;

  group.items.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push(`${group.name}[${index}] 不是对象，已跳过`);
      return;
    }

    const id = makeId(group.year, index + 1);
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const org = typeof raw.org === 'string' ? raw.org.trim() : '';
    const desc = descToPlain(typeof raw.desc === 'string' ? raw.desc : '');
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';

    if (!name) {
      stats.noName += 1;
      warnings.push(`${id} 缺少 name`);
    }

    const links = [];
    const seenPlatforms = new Set();
    for (const entry of Array.isArray(raw.links) ? raw.links : []) {
      const rawUrl = entry && typeof entry === 'object' ? entry.link : entry;
      const url = normalizeUrl(rawUrl);
      if (!url) {
        stats.droppedLinks += 1;
        warnings.push(`${id} 的链接无法解析，已丢弃: ${JSON.stringify(rawUrl)}`);
        continue;
      }
      if (url !== String(rawUrl).trim()) stats.normalizedLinks += 1;
      const platform = detectPlatform(url);
      stats.hosts[new URL(url).hostname] = (stats.hosts[new URL(url).hostname] ?? 0) + 1;
      stats.platforms[platform] = (stats.platforms[platform] ?? 0) + 1;
      // 同一平台只保留第一条（历史上有人重复贴了同一个 CF 主页）
      if (platform !== 'other') {
        if (seenPlatforms.has(platform)) {
          stats.droppedLinks += 1;
          warnings.push(`${id} 重复的 ${platform} 链接，已丢弃: ${url}`);
          continue;
        }
        seenPlatforms.add(platform);
      }
      links.push({ platform, url });
    }
    if (links.length === 0) stats.noLinks += 1;

    const member = {
      schemaVersion: 1,
      id,
      enrollYear: group.year,
      name: name || '未命名',
      // title 是卡片上「@」前面那行，放成就/去向摘要，如「ICPC金 / 清华硕」
      ...(title ? { title } : {}),
      ...(org ? { org } : {}),
      ...(desc ? { desc } : {}),
      ...(raw.avatar ? { avatar: String(raw.avatar).trim() } : {}),
      ...(raw.sponsor ? { sponsor: String(raw.sponsor).trim() } : {}),
      links,
      hidden: false,
    };

    stats.members += 1;
    stats.perYear[group.year] = (stats.perYear[group.year] ?? 0) + 1;
    if (desc.length > stats.maxDescLength) {
      stats.maxDescLength = desc.length;
      stats.longestDescId = id;
    }
    stats.maxNameLength = Math.max(stats.maxNameLength, name.length);
    stats.maxOrgLength = Math.max(stats.maxOrgLength, org.length);
    members.push(member);
  });
}

// 同一届里昵称重复：仅供管理员参考，不阻止迁移（id 才是主键）
const byYearName = new Map();
for (const m of members) {
  const key = `${m.enrollYear}::${m.name}`;
  if (byYearName.has(key)) stats.duplicateNames.push(`${key} （${byYearName.get(key)} 与 ${m.id}）`);
  else byYearName.set(key, m.id);
}

const outDir = resolve(root, args.out);
const countersDir = resolve(root, args.counters);

if (!args.dryRun) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(countersDir, { recursive: true });

  for (const member of members) {
    await writeFile(join(outDir, `${member.id}.json`), `${JSON.stringify(member, null, 2)}\n`, 'utf8');
  }

  // 计数器对每个出现过的年级都建一份，空年级也要有（新人入会时从这里取号）
  const years = [...new Set([...groups.map((g) => g.year), ...members.map((m) => m.enrollYear)])].sort((a, b) => a - b);
  for (const year of years) {
    const count = members.filter((m) => m.enrollYear === year).length;
    await writeFile(join(countersDir, `${year}.json`), `${JSON.stringify({ next: count + 1 }, null, 2)}\n`, 'utf8');
  }
}

const report = {
  source: args.from,
  dryRun: args.dryRun,
  totalMembers: stats.members,
  groups: stats.groups,
  perYear: stats.perYear,
  longestDesc: { id: stats.longestDescId, length: stats.maxDescLength },
  maxNameLength: stats.maxNameLength,
  maxOrgLength: stats.maxOrgLength,
  platforms: stats.platforms,
  hosts: stats.hosts,
  noLinks: stats.noLinks,
  noName: stats.noName,
  droppedLinks: stats.droppedLinks,
  normalizedLinks: stats.normalizedLinks,
  duplicateNames: stats.duplicateNames,
  warnings: warnings.slice(0, 60),
  warningCount: warnings.length,
};

console.log(JSON.stringify(report, null, 2));
