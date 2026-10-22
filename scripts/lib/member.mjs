// 太庙成员数据的共享规约：平台识别、文本归一化、转义、id 解析。
// 同时被 scripts/*（Node）与 worker/*（Cloudflare）引用，改一处两边生效。

/** 允许的链接平台。渲染层按这个枚举查图标，所以不能随便加。 */
export const PLATFORMS = [
  'codeforces',
  'luogu',
  'atcoder',
  'nowcoder',
  'vjudge',
  'github',
  'blog',
  'other',
];

const PLATFORM_BY_HOST = [
  [/(^|\.)codeforces\.com$/, 'codeforces'],
  [/(^|\.)codeforces\.ml$/, 'codeforces'],
  [/(^|\.)luogu\.com(\.cn)?$/, 'luogu'],
  [/(^|\.)luogu\.org$/, 'luogu'],
  [/(^|\.)atcoder\.jp$/, 'atcoder'],
  [/(^|\.)nowcoder\.com$/, 'nowcoder'],
  [/(^|\.)vjudge\.net$/, 'vjudge'],
  [/(^|\.)github\.com$/, 'github'],
];

/** 从 URL 推断平台；认不出的一律 other。 */
export function detectPlatform(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  for (const [re, platform] of PLATFORM_BY_HOST) {
    if (re.test(host)) return platform;
  }
  return 'other';
}

/**
 * 把历史数据里的 HTML 片段降级为纯文本。
 * 现在 desc 里只用过 <br/>，但为了以后不被塞别的标签，这里一律剥掉标签。
 */
export function descToPlain(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** 转义为 HTML 文本节点内容。渲染 desc 前必须过这一步。 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * 纯文本 desc → 可安全交给 v-html 的字符串。
 * 先整体转义，再把换行还原成 <br/>，因此结构上不可能产生标签。
 */
export function plainToSafeHtml(plain) {
  return escapeHtml(plain).replace(/\r\n?/g, '\n').replace(/\n/g, '<br/>');
}

/** 生成 id：YYYY-NNN。 */
export function makeId(year, seq) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new RangeError(`非法年份: ${year}`);
  if (!Number.isInteger(seq) || seq < 1 || seq > 999) throw new RangeError(`非法顺序号: ${seq}`);
  return `${year}-${String(seq).padStart(3, '0')}`;
}

export function parseId(id) {
  const m = /^(\d{4})-(\d{3})$/.exec(String(id ?? ''));
  if (!m) return null;
  return { year: Number(m[1]), seq: Number(m[2]) };
}

/** 把任意来源的链接规整成 http(s) 绝对地址；不合法返回 null。 */
export function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    try {
      url = new URL(`https://${text}`);
    } catch {
      return null;
    }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.toString();
}
