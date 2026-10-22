// 飞书附件列 → 仓库里的本地图片文件。
//
// 表格里用「附件」字段收集头像，成员直接上传；
// 同步时把附件下载进 docs/public/avatar/<id>.<ext>，数据里只留站内路径。
// 这样官网不依赖任何外部图床，链接不会失效，也不会有防盗链问题。

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = 2 * 1024 * 1024; // 单张上限 2MB，超了跳过并报告

function extFromName(name) {
  const match = /\.([A-Za-z0-9]{2,5})$/.exec(String(name ?? ''));
  return match ? match[1].toLowerCase() : null;
}

/** 判断一个单元格是不是附件数组。 */
export function isAttachmentCell(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item && typeof item === 'object' && typeof item.file_token === 'string')
  );
}

/** 从附件对象里推断扩展名。 */
export function pickExtension(attachment) {
  return (
    EXT_BY_TYPE[String(attachment.type ?? '').toLowerCase()] ||
    extFromName(attachment.name) ||
    'jpg'
  );
}

/**
 * 把记录里的附件列换成站内路径。
 *
 * @param {object} options
 * @param {Array<{fields: object}>} options.records 飞书记录
 * @param {(fields: object) => string|null} options.getId 从记录里取 id
 * @param {string[]} options.avatarColumns 被当作头像的列名
 * @param {string} options.token tenant_access_token
 * @param {string} [options.base] 开放平台域名
 * @param {Function} [options.fetchImpl]
 * @param {(relativePath: string, bytes: Buffer) => Promise<void>} options.writeAvatar
 *   由调用方决定写到哪里（便于测试注入）
 * @param {string} [options.urlPrefix] 写进数据的路径前缀，默认 /avatar
 * @returns {Promise<{saved: string[], skipped: string[]}>}
 */
export async function resolveAvatarAttachments({
  records,
  getId,
  avatarColumns,
  token,
  base = 'https://open.feishu.cn',
  fetchImpl = fetch,
  writeAvatar,
  urlPrefix = '/avatar',
}) {
  const saved = [];
  const skipped = [];

  for (const record of records) {
    const fields = record.fields ?? {};
    const column = avatarColumns.find((name) => isAttachmentCell(fields[name]));
    if (!column) continue;

    const id = getId(fields);
    if (!id) {
      skipped.push(`有头像附件但取不到 id，已跳过`);
      continue;
    }

    const attachment = fields[column][0];
    if (Number(attachment.size) > MAX_BYTES) {
      skipped.push(`${id} 的头像超过 2MB（${Math.round(Number(attachment.size) / 1024)}KB），已跳过`);
      continue;
    }

    const url = `${base.replace(/\/$/, '')}/open-apis/drive/v1/medias/${attachment.file_token}/download`;
    const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) {
      skipped.push(`${id} 的头像下载失败：HTTP ${response.status}${
        response.status === 403 ? '（应用可能缺少"下载云文档文件"权限）' : ''
      }`);
      continue;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      skipped.push(`${id} 的头像下载后超过 2MB，已跳过`);
      continue;
    }

    const ext = pickExtension(attachment);
    const relativePath = `${urlPrefix}/${id}.${ext}`;
    await writeAvatar(relativePath.replace(`${urlPrefix}/`, ''), bytes);

    // 把单元格替换成站内路径，后续合并逻辑当作普通头像处理
    fields[column] = relativePath;
    saved.push(`${id} → ${relativePath}`);
  }

  return { saved, skipped };
}
