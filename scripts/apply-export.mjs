#!/usr/bin/env node
// 把飞书表单导出的 CSV 合并进太庙数据。
//
//   node scripts/apply-export.mjs 导出.csv            # 预览（默认不落盘）
//   node scripts/apply-export.mjs 导出.csv --write    # 真正写入
//
// 规则：空着=保持原值、写「清空」=删除、有内容=覆盖。逻辑在 lib/apply-rows.mjs，
// 与飞书 API 同步入口（sync-feishu.mjs）共用同一份。

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyRows, renderReport } from './lib/apply-rows.mjs';
import { parseCsv } from './lib/rows.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(root, 'docs/_data/members');

const args = process.argv.slice(2);
const csvPath = args.find((arg) => !arg.startsWith('--'));
const write = args.includes('--write');
if (!csvPath) {
  console.error('用法: node scripts/apply-export.mjs <导出.csv> [--write]');
  process.exit(1);
}

const members = new Map();
for (const file of (await readdir(DATA_DIR)).filter((name) => name.endsWith('.json'))) {
  const member = JSON.parse(await readFile(join(DATA_DIR, file), 'utf8'));
  members.set(member.id, { file, member });
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
if (rows.length < 2) {
  console.error('CSV 里没有数据行。');
  process.exit(1);
}

const headerRow = rows[0];
const result = applyRows({ headerRow, rows: rows.slice(1), members, lineOffset: 1 });
console.log(renderReport({ headerRow, ...result }));

if (result.fatal) process.exit(1);

if (write) {
  for (const item of result.touched) {
    await writeFile(join(DATA_DIR, item.file), `${JSON.stringify(item.member, null, 2)}\n`, 'utf8');
  }
  console.log(`\n已写入 ${result.touched.length} 个文件。下一步：npm run validate 然后提交`);
} else if (result.touched.length) {
  console.log('\n（预览模式，未落盘。确认无误后加 --write 执行）');
}

// 有配对失败的行走非零退出，便于 CI 里拦下
if (result.problems.some((p) => p.includes('无法配对'))) process.exitCode = 2;
