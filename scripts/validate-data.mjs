#!/usr/bin/env node
// CI 与本地共用的数据校验入口。任何一条数据不合规就退出码 1，
// 从而挡住「脏数据进 main → 站点构建挂掉」。
//
//   node scripts/validate-data.mjs

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateMember } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'docs/_data/members');

const files = (await readdir(dataDir)).filter((name) => name.endsWith('.json'));
if (files.length === 0) {
  console.error(`没有找到任何数据文件: ${dataDir}`);
  process.exit(1);
}

const problems = [];
const ids = new Map();

for (const file of files.sort()) {
  const raw = await readFile(join(dataDir, file), 'utf8');
  let member;
  try {
    member = JSON.parse(raw);
  } catch (error) {
    problems.push(`${file}: JSON 解析失败 —— ${error.message}`);
    continue;
  }

  const { ok, errors, warnings } = validateMember(member);
  if (!ok) {
    for (const error of errors) problems.push(`${file}: ${error.path} ${error.message}`);
  }
  for (const warning of warnings) console.warn(`[warn] ${file}: ${warning}`);

  // 文件名必须等于 id，否则页面上的顺序与链接都会错位
  const expected = `${member.id}.json`;
  if (expected !== file) problems.push(`${file}: 文件名应与 id 一致（期望 ${expected}）`);

  if (ids.has(member.id)) problems.push(`${file}: id 与 ${ids.get(member.id)} 重复`);
  else ids.set(member.id, file);
}

// 计数器不得回退，否则新人会拿到已存在的 id
const countersDir = join(root, 'docs/_data/counters');
const counterFiles = (await readdir(countersDir).catch(() => [])).filter((name) => name.endsWith('.json'));
for (const file of counterFiles) {
  const year = Number(file.replace('.json', ''));
  const { next } = JSON.parse(await readFile(join(countersDir, file), 'utf8'));
  if (!Number.isInteger(next) || next < 1) {
    problems.push(`counters/${file}: next 必须是 >= 1 的整数`);
    continue;
  }
  const maxSeq = Math.max(0, ...[...ids.keys()].filter((id) => Number(id.slice(0, 4)) === year).map((id) => Number(id.slice(5))));
  if (next <= maxSeq) {
    problems.push(`counters/${file}: next=${next} 会与已存在的 ${year}-${String(maxSeq).padStart(3, '0')} 撞号`);
  }
}

if (problems.length > 0) {
  console.error(`\n数据校验失败（${problems.length} 处）：`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`数据校验通过：${files.length} 条成员记录，${counterFiles.length} 个年度计数器。`);
