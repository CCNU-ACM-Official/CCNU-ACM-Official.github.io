#!/usr/bin/env node
// 本地轮询版：每隔一段时间拉一次飞书表格，有变化就提交并推到你的 fork 分支。
//
//   node scripts/watch-feishu.mjs --once --dry          # 只跑一次、只看有没有变化
//   node scripts/watch-feishu.mjs                        # 每 5 分钟一次，只提交不推送
//   node scripts/watch-feishu.mjs --interval 120 --push   # 每 2 分钟一次，并推到 fork
//   node scripts/watch-feishu.mjs --push --branch feat/taomiao-automation
//
// 前提：环境里能读到飞书凭据（FEISHU_APP_ID 等），或指定 --secret-file 自动加载。
//
// 注意：这条路的"上线"仍然依赖有人合并 PR。推到 fork 分支只是让 PR 一直是最新的。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {
    interval: 300,
    once: false,
    dry: false,
    push: false,
    branch: null,
    secretFile: null,
    remote: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--once') args.once = true;
    else if (flag === '--dry') args.dry = true;
    else if (flag === '--push') args.push = true;
    else if (flag === '--interval') args.interval = Number(argv[++i]);
    else if (flag === '--branch') args.branch = argv[++i];
    else if (flag === '--remote') args.remote = argv[++i];
    else if (flag === '--secret-file') args.secretFile = argv[++i];
    else if (flag === '--help' || flag === '-h') {
      console.log(
        [
          '用法: node scripts/watch-feishu.mjs [选项]',
          '',
          '  --once              只跑一轮就退出（适合配合系统定时任务）',
          '  --dry               只预览，不写文件、不提交',
          '  --interval <秒>     轮询间隔，默认 300',
          '  --push              有变化时提交并推到 fork',
          '  --branch <名称>     推送目标分支，默认当前分支',
          '  --remote <url>      推送地址（默认取 origin）',
          '  --secret-file <路径>  从文件读 FEISHU_* 变量（每行 KEY=VALUE）',
        ].join('\n'),
      );
      process.exit(0);
    } else throw new Error(`未知参数: ${flag}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// 从文件补环境变量（方便本地用，不把 secret 写进命令行）
if (args.secretFile) {
  const path = resolve(args.secretFile);
  if (!existsSync(path)) {
    console.error(`找不到凭据文件：${path}`);
    process.exit(1);
  }
  // 文件里可以写 FEISHU_APP_ID，也可以写 app_id，都能认
  const ALIAS = {
    app_id: 'FEISHU_APP_ID',
    app_secret: 'FEISHU_APP_SECRET',
    app_token: 'FEISHU_APP_TOKEN',
    table_id: 'FEISHU_TABLE_ID',
  };
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at < 0) continue;
    const rawKey = trimmed.slice(0, at).trim();
    const value = trimmed.slice(at + 1).trim().replace(/^["']|["']$/g, '');
    const key = rawKey.startsWith('FEISHU_') ? rawKey : ALIAS[rawKey.toLowerCase()];
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', ...options });
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
  return { code: result.status, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

function stamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function oneRound() {
  console.log(`\n[${stamp()}] 拉取飞书表格…`);

  const syncArgs = ['scripts/sync-feishu.mjs'];
  if (!args.dry) syncArgs.push('--write');
  const sync = run(process.execPath, syncArgs);
  if (sync.status !== 0) {
    console.error(`[${stamp()}] 同步失败（退出码 ${sync.status}），本轮跳过`);
    return;
  }

  const status = git('status', '--porcelain', 'docs/_data');
  if (!status.out) {
    console.log(`[${stamp()}] ${args.dry ? '（--dry：只预览，未写入）' : '没有变化'}`);
    return;
  }

  const changed = status.out.split('\n').filter(Boolean).length;
  console.log(`[${stamp()}] 检测到 ${changed} 个数据文件有变化`);

  if (args.dry) {
    console.log('  （--dry：不提交）');
    git('checkout', '--', 'docs/_data');
    return;
  }

  git('add', 'docs/_data');
  const message = `sync: 从飞书表格同步（${new Date().toISOString().slice(0, 16).replace('T', ' ')}）`;
  const commit = git('commit', '-m', message);
  if (commit.code !== 0) {
    console.error(`  提交失败：${commit.err || commit.out}`);
    return;
  }
  console.log(`  已提交：${git('log', '--oneline', '-1').out}`);

  if (!args.push) {
    console.log('  （加 --push 才会推到远端）');
    return;
  }

  const branch = args.branch || git('rev-parse', '--abbrev-ref', 'HEAD').out;
  const remote = args.remote || 'origin';
  const push = git('push', remote, `HEAD:${branch}`);
  if (push.code !== 0) {
    console.error(`  推送失败：${push.err}`);
    console.error('  提示：本地 branch 与远端不一致时，可先 git pull --rebase 再重试');
    return;
  }
  console.log(`  已推送到 ${remote}/${branch}`);
}

console.log(`太庙同步 · 本地轮询`);
console.log(`  间隔：${args.interval}s   模式：${args.dry ? '预览' : '写入'}   ${args.push ? '提交并推送' : '只提交'}`);

if (args.once) {
  oneRound();
  process.exit(0);
}

oneRound();
const timer = setInterval(oneRound, Math.max(30, args.interval) * 1000);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(timer);
    console.log(`\n收到 ${signal}，停止轮询`);
    process.exit(0);
  });
}
