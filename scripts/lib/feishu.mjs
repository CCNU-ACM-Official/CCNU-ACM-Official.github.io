// 飞书开放平台的最小客户端：只做"拿 token"和"分页读多维表格"两件事。
// fetch 可注入，方便在本地用假响应测试整条链路。

const DEFAULT_BASE = 'https://open.feishu.cn';

export async function getTenantToken({ appId, appSecret, base = DEFAULT_BASE, fetchImpl = fetch }) {
  const response = await fetchImpl(`${base.replace(/\/$/, '')}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败：${data.code} ${data.msg}`);
  }
  return data.tenant_access_token;
}

export async function listRecords({
  token,
  appToken,
  tableId,
  base = DEFAULT_BASE,
  fetchImpl = fetch,
  pageSize = 500,
  maxPages = 50,
}) {
  const records = [];
  let pageToken = '';

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(
      `${base.replace(/\/$/, '')}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    );
    url.searchParams.set('page_size', String(pageSize));
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    const data = await response.json();

    if (data.code !== 0) {
      const hint =
        data.code === 1254005 || data.code === 99991672
          ? '（多半是应用没被加为该多维表格的协作者，或没申请 bitable 读取权限）'
          : '';
      throw new Error(`读取多维表格失败：${data.code} ${data.msg}${hint}`);
    }

    records.push(...(data.data?.items ?? []));
    if (!data.data?.has_more) break;
    pageToken = data.data.page_token;
  }

  return records;
}
