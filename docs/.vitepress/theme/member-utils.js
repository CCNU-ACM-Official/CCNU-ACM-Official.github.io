// 太庙卡片的渲染适配层：把数据文件变成 VPTeamMembers 需要的形状。
//
// 关键点：VPTeamMembers 内部用 v-html 渲染 desc（VPTeamMembersItem.vue:42），
// 所以 desc 必须"先转义、再还原换行"，不能让原始 HTML 直接进 DOM。
// 这一层是唯一允许生成 HTML 的地方，其余数据一律纯文本。

import { plainToSafeHtml } from '../../../scripts/lib/member.mjs'

// 平台图标。目前仓库里只有 cf.png，其余平台先用文字标记占位；
// 补上图标时只需替换这里，数据文件不用动。
const PLATFORM_ICONS = {
  codeforces: '<img src="/cf.png" alt="Codeforces"/>',
  luogu: '<span class="tf-platform-badge">洛谷</span>',
  atcoder: '<span class="tf-platform-badge">AtCoder</span>',
  nowcoder: '<span class="tf-platform-badge">牛客</span>',
  vjudge: '<span class="tf-platform-badge">vJudge</span>',
  github: '<span class="tf-platform-badge">GitHub</span>',
  blog: '<span class="tf-platform-badge">博客</span>',
  other: '<span class="tf-platform-badge">链接</span>',
}

const DEFAULT_AVATAR = '/avatar/default.jpg'

function iconFor(platform) {
  return PLATFORM_ICONS[platform] ?? PLATFORM_ICONS.other
}

/** 按 id 升序（= 年份 + 入会顺序），保证渲染顺序稳定。 */
export function sortMembers(members) {
  return [...members].sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

/** 数据条目 → VPTeamMembers 卡片。 */
export function toCard(member) {
  return {
    avatar: member.avatar || DEFAULT_AVATAR,
    name: member.name,
    // title 渲染为纯文本（{{ }} 插值），可以放「ICPC金 / 清华硕」这类成就与去向
    ...(member.title ? { title: member.title } : {}),
    org: member.org ?? '',
    ...(member.sponsor ? { sponsor: member.sponsor } : {}),
    // desc 是唯一走 v-html 的字段，必须由这里产出安全 HTML
    desc: member.desc ? plainToSafeHtml(member.desc) : undefined,
    // 空数组会让 VPTeamMembers 渲染一个空的 .links 容器，留下多余留白；
    // 只有真的有链接时才给这个键（与迁移前的版式一致）。
    ...((member.links ?? []).length
      ? {
          links: member.links.map((item) => ({
            icon: { svg: iconFor(item.platform) },
            link: item.url,
          })),
        }
      : {}),
  }
}

/** 把「成员数据 + 计数器」汇总成按年份倒序的分组。 */
export function groupByYear(members, extraYears = []) {
  const years = [...new Set([...members.map((m) => m.enrollYear), ...extraYears])].sort((a, b) => b - a)
  return years.map((year) => ({
    year,
    members: sortMembers(members.filter((m) => m.enrollYear === year)).map(toCard),
  }))
}
