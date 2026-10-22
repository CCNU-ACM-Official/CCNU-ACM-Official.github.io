#!/usr/bin/env node
// L3：GitHub Actions 定时从飞书多维表格拉数据 → 合并 → 写回本仓库。
//
//   node scripts/sync-feishu.mjs            # 预览
//   node scripts/sync-feishu.mjs --write    # 写入
//
// 为什么是"拉"而不是"webhook 推"：
//   推的模式要求飞书那边持有一个能写仓库的 token；拉的模式下飞书只持有只读凭据，
//   GitHub 的写权限始终留在 GitHub 自己的 runner 里。
//
// 需要的环境变量（在仓库 Settings → Secrets 里配）：
//   FEISHU_APP_ID / FEISHU_APP_SECRET    自建应用的凭据（只需多维表格读取权限）
//   FEISHU_APP_TOKEN                     多维表格的 app_token（表格 URL 里那串）
//   FEISHU_TABLE_ID                      数据表的 table_id（tbl 开头）
// 可选：
//   FEISHU_BASE       默认 https://open.feishu.cn（Lark 国际版用 https://open.larksuite.com）
//   FEISHU_COLUMNS    逗号分隔的列顺序，例如 "id,年级,昵称,头衔/成就/去向,学院,个性签名"

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyRows, renderReport } from './lib/apply-rows.mjs';
import { feishuRecordsToMatrix } from './lib/rows.mjs';
import { getTenantToken, listRecords } from './lib/feishu.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(root, 'docs/_data/members');
const BASE = process.env.FEISHU_BASE || 'https://open.feishu.cn';
const WRITE = process.argv.includes('--write');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`缺少环境变量 ${name}`);
    process.exit(1);
  }
  return value;
}

const appId = requireEnv('FEISHU_APP_ID');
const appSecret = requireEnv('FEISHU_APP_SECRET');
const appToken = requireEnv('FEISHU_APP_TOKEN');
const tableId = requireEnv('FEISHU_TABLE_ID');
const preferred = (process.env.FEISHU_COLUMNS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const members = new Map();
for (const file of (await readdir(DATA_DIR)).filter((name) => name.endsWith('.json'))) {
  const member = JSON.parse(await readFile(join(DATA_DIR, file), 'utf8'));
  members.set(member.id, { file, member });
}

const token = await getTenantToken({ appId, appSecret, base: BASE });
const records = await listRecords({ token, appToken, tableId, base: BASE });
console.log(`从飞书读到 ${records.length} 条记录。`);

// 附件列（头像）先落到本地文件，再把单元格换成站内路径。
// 只在 --write 时真正写盘，预览模式下只做一次"能不能下到"的探测。
const AVATAR_DIR = join(root, 'docs/public/avatar');
const idColumn = ['id', '编号', '标识', '成员ID'].find((name) => records.some((r) => name in (r.fields ?? {})));
const avatarColumns = ['头像', '头像图片', '头像照片'].filter((name) =>
  records.some((r) => name in (r.fields ?? {})),
);

if (avatarColumns.length) {
  const { resolveAvatarAttachments } = await import('./lib/attachments.mjs');
  const { normalizeFeishuCell } = await import('./lib/rows.mjs');

  const outcome = await resolveAvatarAttachments({
    records,
    avatarColumns,
    token,
    base: BASE,
    getId: (fields) => (idColumn ? normalizeFeishuCell(fields[idColumn]).trim() : ''),
    writeAvatar: async (name, bytes) => {
      if (!WRITE) return;
      await mkdir(AVATAR_DIR, { recursive: true });
      await writeFile(join(AVATAR_DIR, name), bytes);
    },
  });

  if (outcome.saved.length) {
    console.log(`头像附件：${outcome.saved.length} 张${WRITE ? '已保存' : '可下载（预览模式未落盘）'}`);
    for (const line of outcome.saved) console.log(`  ${line}`);
  }
  for (const line of outcome.skipped) console.log(`  ⚠ ${line}`);

  // 上传优先：有「头像」附件列时，就不让「头像地址」文本列参与竞争。
  // 两列都映射到 avatar，否则结果取决于列顺序，容易莫名其妙。
  if (WRITE) {
    for (const record of records) {
      if (record.fields) delete record.fields['头像地址'];
    }
  }
}

const { headerRow, rows } = feishuRecordsToMatrix(records, preferred);
const result = applyRows({ headerRow, rows, members, lineOffset: 0 });
console.log(renderReport({ headerRow, ...result }));

if (result.fatal) process.exit(1);

if (WRITE) {
  for (const item of result.touched) {
    await writeFile(join(DATA_DIR, item.file), `${JSON.stringify(item.member, null, 2)}\n`, 'utf8');
  }
  console.log(`\n已写入 ${result.touched.length} 个文件。`);
} else if (result.touched.length) {
  console.log('\n（预览模式，未落盘；加 --write 执行）');
}
