// import {defineConfig} from 'vitepress'

export default {
  lang: 'zh-CN',
  base: '/',
  title: 'CCNU ACM',
  siteTitle: 'CCNU ACM',
  description: 'CCNU ACM Wiki',
  lastUpdated: true,
  srcExclude: ['**/README.md', '**/TODO.md'],
  head: [
    ['link', {rel: 'icon', type: 'image/png', href: '/cf.png'}],
    // ['link', { rel: 'icon', type: 'image/svg+xml', href: '/path/to/icon.svg' }], for svg
  ],
  markdown: {
    // theme: 'material-theme-palenight',
    lineNumbers: true,
    math: true,
  },
  themeConfig: {
    logo: '/cf.png',
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present CCNUACM'
    },
    search: {
      provider: 'local'
    },
    outline: 'deep',
    editLink: {
      pattern: 'https://github.com/',
      text: 'Edit this page on GitHub'
    },
    externalLinkIcon: true,
    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },
    socialLinks: [
      {icon: 'github', link: 'https://github.com/CCNU-ACM-Official'},
    ],
    nav: [
      {text: '首页', link: '/'},
      {
        text: '学习资源',
        items: [
          {
            text: '语法入门',
            link: '/语法入门/1.语法入门',
          },
          {
            text: '基础算法',
            link: '/基础算法/4.递推递归',
          },
          {
            text: '搜索',
            link: '/搜索/13.DFS',
          },
          {
            text: '动态规划',
            link: '/动态规划/15.记忆化搜索与动态规划',
          },
          {
            text: '数据结构',
            link: '/数据结构/',
          },
          {
            text: '数学',
            link: '/数学/数论基础',
          },
          {
            text: '字符串',
            link: '/字符串/哈希',
          },
          {
            text: '图论',
            link: '/图论/18.图与树入门',
          },
          {
            text: '计算几何', link: '/计算几何'
          },
          {
            text: '杂项', link: '/杂项/对顶堆'
          },
        ]
      },
      {text: '协会成员', link: '/协会成员'},
      {text: '活动日历', link: '/活动日历'},
      {text: '协会成果', link: '/协会成果'},
      {text: '关于我们', link: '/关于我们'},
    ],
    sidebar:
        {
          '/语法入门/':
              [
                {
                  text: '语法入门',
                  items: [
                    {text: '1.语法入门', link: '/语法入门/1.语法入门'},
                    {text: '2.位运算', link: '/语法入门/2.位运算'},
                    {text: '3.时空复杂度与枚举', link: '/语法入门/3.时空复杂度与枚举'},
                    {text: '11.STL', link: '/语法入门/11.STL'}
                  ]
                },
              ],
          '/基础算法/':
              [
                {
                  text: '基础算法',
                  items: [
                    {text: '4.递推递归', link: '/基础算法/4.递推递归'},
                    {text: '5.排序', link: '/基础算法/5.排序'},
                    {text: '6.贪心', link: '/基础算法/6.贪心'},
                    {text: '7.二分', link: '/基础算法/7.二分'},
                    {text: '8.前缀和差分', link: '/基础算法/8.前缀和差分'},
                    {text: '9.双指针', link: '/基础算法/9.双指针'},
                    {text: '10.分治', link: '/基础算法/10.分治'},
                    {text: '12.倍增', link: '/基础算法/12.倍增'},
                  ]
                },
              ],
          '/搜索/':
              [
                {
                  text: '搜索',
                  items: [
                    {text: '13.DFS', link: '/搜索/13.DFS'},
                    {text: '14.BFS', link: '/搜索/14.BFS'},
                  ]
                },
              ],
          '/动态规划/':
              [
                {
                  text: '动态规划',
                  items: [
                    {text: '15.记忆化搜索与动态规划', link: '/动态规划/15.记忆化搜索与动态规划'},
                    {text: '16.背包', link: '/动态规划/16.背包'},
                    {text: '17.区间dp', link: '/动态规划/17.区间dp'},
                    {text: '19.树形dp', link: '/动态规划/19.树形dp'},
                    {text: '20.状压dp', link: '/动态规划/20.状压dp'},
                  ]
                },
              ],
          '/数据结构/':
              [
                {
                  text: '数据结构',
                  items: []
                },
              ],
          '/数学/':
              [
                {
                  text: '数学',
                  items: [
                    {text: '数论基础', link: '/数学/数论基础'},
                    {text: '最大公约数', link: '/数学/最大公约数'},
                    {text: '扩展欧几里得', link: '/数学/扩展欧几里得'},
                    {text: '置换', link: '/数学/置换'},
                  ]
                },
              ],
          '/字符串/':
              [
                {
                  text: '字符串',
                  items: [
                    {text: '哈希', link: '/字符串/哈希'},
                  ]
                },
              ],
          '/图论/':
              [
                {
                  text: '图论',
                  items: [
                    {text: '18.图与树入门', link: '/图论/18.图与树入门'},
                    {text: '图论相关概念', link: '/图论/图论相关概念'},
                  ]
                },
              ],
          '/计算几何/':
              [
                {
                  text: '计算几何',
                  items: []
                },
              ],
          '/杂项/':
              [
                {
                  text: '杂项',
                  items: [
                    {text: '对顶堆', link: '/杂项/对顶堆'},
                    {text: '对顶栈', link: '/杂项/对顶栈'},
                  ]
                },
              ],
        }
  }
}