// 从 VitePress 页面 <script setup> 里抠出 JS 对象字面量数组。
// 只实现本仓库实际用到的语法子集：对象、数组、字符串（单/双引号与常见转义）、
// 数字、true/false/null，以及 // 与 /* */ 注释。不依赖任何第三方解析器。

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;

/** 跳过空白与注释，返回下一个有效字符的下标。 */
export function skipTrivia(src, i) {
  for (;;) {
    while (i < src.length && /\s/.test(src[i])) i += 1;
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) throw new SyntaxError('未闭合的块注释');
      i = end + 2;
      continue;
    }
    return i;
  }
}

function parseString(src, i) {
  const quote = src[i];
  let out = '';
  i += 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const next = src[i + 1];
      switch (next) {
        case 'n': out += '\n'; break;
        case 'r': out += '\r'; break;
        case 't': out += '\t'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'v': out += '\v'; break;
        case '0': out += '\0'; break;
        case 'u': {
          const hex = src.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxError(`非法 \\u 转义 @${i}`);
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        case 'x': {
          const hex = src.slice(i + 2, i + 4);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new SyntaxError(`非法 \\x 转义 @${i}`);
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
          continue;
        }
        case '\n': i += 2; continue; // 续行
        case undefined: throw new SyntaxError('字符串在文件末尾处未闭合');
        default: out += next; i += 2; continue;
      }
      i += 2;
      continue;
    }
    if (ch === quote) return [out, i + 1];
    out += ch;
    i += 1;
  }
  throw new SyntaxError('字符串未闭合');
}

function parseKey(src, i) {
  i = skipTrivia(src, i);
  if (src[i] === '"' || src[i] === "'") {
    const [key, next] = parseString(src, i);
    return [key, next];
  }
  let end = i;
  while (end < src.length && (IDENT_PART.test(src[end]) || src[end] === '-')) end += 1;
  if (end === i) throw new SyntaxError(`无法解析键名 @${i}: ${JSON.stringify(src.slice(i, i + 24))}`);
  return [src.slice(i, end), end];
}

/** 解析一个 JS 字面量，返回 [value, nextIndex]。 */
export function parseValue(src, i) {
  i = skipTrivia(src, i);
  const ch = src[i];

  if (ch === '{') {
    const obj = {};
    i += 1;
    for (;;) {
      i = skipTrivia(src, i);
      if (src[i] === '}') return [obj, i + 1];
      const [key, afterKey] = parseKey(src, i);
      i = skipTrivia(src, afterKey);
      if (src[i] !== ':') throw new SyntaxError(`缺少冒号 @${i}: ${JSON.stringify(src.slice(i - 20, i + 20))}`);
      const [value, afterValue] = parseValue(src, i + 1);
      obj[key] = value;
      i = skipTrivia(src, afterValue);
      if (src[i] === ',') { i += 1; continue; }
      if (src[i] === '}') return [obj, i + 1];
      throw new SyntaxError(`对象内缺少逗号或右花括号 @${i}: ${JSON.stringify(src.slice(i - 20, i + 20))}`);
    }
  }

  if (ch === '[') {
    const arr = [];
    i += 1;
    for (;;) {
      i = skipTrivia(src, i);
      if (src[i] === ']') return [arr, i + 1];
      const [value, afterValue] = parseValue(src, i);
      arr.push(value);
      i = skipTrivia(src, afterValue);
      if (src[i] === ',') { i += 1; continue; }
      if (src[i] === ']') return [arr, i + 1];
      throw new SyntaxError(`数组内缺少逗号或右方括号 @${i}: ${JSON.stringify(src.slice(i - 20, i + 20))}`);
    }
  }

  if (ch === '"' || ch === "'") return parseString(src, i);

  // 数字 / 布尔 / null / 裸标识符
  let end = i;
  while (end < src.length && /[A-Za-z0-9_$.+\-]/.test(src[end])) end += 1;
  if (end === i) throw new SyntaxError(`无法解析的值 @${i}: ${JSON.stringify(src.slice(i, i + 24))}`);
  const raw = src.slice(i, end);
  if (raw === 'true') return [true, end];
  if (raw === 'false') return [false, end];
  if (raw === 'null') return [null, end];
  if (raw === 'undefined') return [undefined, end];
  if (/^-?\d+(\.\d+)?$/.test(raw)) return [Number(raw), end];
  throw new SyntaxError(`不支持的裸标识符 "${raw}" @${i}`);
}

/**
 * 找出形如 `const members2024 = [ ... ]` 的数组。
 * @returns {{name: string, year: number, items: any[], start: number, end: number}[]}
 */
export function findNamedArrays(content, prefix = 'members') {
  const re = new RegExp(`const\\s+(${prefix}\\d{4})\\s*=\\s*\\[`, 'g');
  const found = [];
  let match;
  while ((match = re.exec(content)) !== null) {
    const arrayStart = match.index + match[0].length - 1;
    const [items, end] = parseValue(content, arrayStart);
    if (!Array.isArray(items)) throw new SyntaxError(`${match[1]} 不是数组`);
    found.push({
      name: match[1],
      year: Number(match[1].slice(prefix.length)),
      items,
      start: match.index,
      end,
    });
    re.lastIndex = end;
  }
  return found;
}
