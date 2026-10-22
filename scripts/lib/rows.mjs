// 表格行 → 成员字段的统一规约。
// CSV（飞书导出）和飞书多维表格 API 最终都会被规范成「表头 + 行矩阵」，
// 后面的合并逻辑只有一份，两条入口不会跑偏。

export const HEADER_ALIASES = {
  id: ['id', '编号', 'ID', '标识'],
  enrollYear: ['年级', '入学年级', 'enrollYear', '年份'],
  name: ['昵称', 'name', '昵称/ID', 'ID昵称'],
  title: ['头衔', '头衔/成就/去向', '成就', '去向', 'title'],
  org: ['学院', 'org', '院系'],
  desc: ['个性签名', '签名', '简介', 'desc'],
  avatar: ['头像', '头像地址', 'avatar'],
};

export const LINK_COLUMNS = {
  codeforces: ['codeforces', 'Codeforces', 'CF'],
  luogu: ['洛谷', 'luogu'],
  atcoder: ['atcoder', 'AtCoder'],
  nowcoder: ['牛客', 'nowcoder'],
  vjudge: ['vjudge', 'VJudge'],
  github: ['github', 'GitHub'],
  blog: ['博客', 'blog'],
};

/** 单元格写这两个词就表示"清空这个字段"，而不是填这两个字。 */
export const CLEAR_WORDS = new Set(['清空', '删除', '不填', 'clear', 'CLEAR']);

/** 够用的 CSV 解析：支持引号、引号内逗号与换行、双引号转义。 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((line) => line.some((cell) => String(cell).trim() !== ''));
}

/** 表头 → 字段下标。认不出的列会被忽略（比如"提交时间"）。 */
export function mapHeaders(headerRow) {
  const map = {};
  headerRow.forEach((raw, index) => {
    const header = String(raw).trim();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(header)) map[field] = index;
    }
    for (const [platform, aliases] of Object.entries(LINK_COLUMNS)) {
      if (aliases.includes(header)) map[`link:${platform}`] = index;
    }
  });
  return map;
}

/**
 * 飞书多维表格的单元格值 → 纯文本。
 * 真实形状很杂：文本是多段 {type,text} 数组，超链接是 {link,text}，
 * 单选是字符串，日期是毫秒数，数字是 number。
 */
export function normalizeFeishuCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '是' : '';

  if (Array.isArray(value)) {
    const parts = value.map((item) => normalizeFeishuCell(item)).filter(Boolean);
    // 文本段拼起来不该有分隔符；多段超链接之类用逗号更清楚
    const joined = parts.join('');
    return joined.trim();
  }

  if (typeof value === 'object') {
    if (typeof value.link === 'string') return value.link.trim();
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.name === 'string') return value.name.trim();
    if (typeof value.value === 'string') return value.value.trim();
    return '';
  }

  return '';
}

/**
 * 飞书记录数组 → 「表头 + 行」矩阵，与 CSV 解析结果同构。
 * 表头取所有记录字段名的并集，保证某条记录漏填的列不会消失。
 */
export function feishuRecordsToMatrix(records, preferredColumns = []) {
  const columns = [];
  const seen = new Set();
  for (const name of preferredColumns) {
    if (!seen.has(name)) {
      seen.add(name);
      columns.push(name);
    }
  }
  for (const record of records) {
    for (const name of Object.keys(record.fields ?? {})) {
      if (!seen.has(name)) {
        seen.add(name);
        columns.push(name);
      }
    }
  }

  const rows = records.map((record) =>
    columns.map((name) => normalizeFeishuCell((record.fields ?? {})[name])),
  );

  return { headerRow: columns, rows };
}
