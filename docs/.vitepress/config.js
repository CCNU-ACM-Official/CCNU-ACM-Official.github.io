// import {defineConfig} from 'vitepress'

export default {
    lang: 'zh-CN',
    base: '/',
    title: 'CCNU ACM',
    siteTitle: 'CCNU ACCCCCM',
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
                        link: '/语法入门/C++',
                    },
                    {
                        text: '基础算法',
                        link: '/基础算法/递归递推',
                    },
                    {
                        text: '搜索',
                        link: '/搜索/DFS',
                    },
                    {
                        text: '动态规划',
                        link: '/动态规划/记忆化搜索与动态规划',
                    },
                    {
                        text: '数据结构',
                        link: '/数据结构/单调队列',
                    },
                    {
                        text: '数学',
                        link: '/数学/筛法和数论分块',
                    },
                    {
                        text: '字符串',
                        link: '/字符串/字符串基础及哈希',
                    },
                    {
                        text: '图论',
                        link: '/图论/拓扑排序',
                    },
                    {
                        text: '计算几何', link: '/计算几何'
                    },
                    {
                        text: '杂项', link: '/杂项'
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
                                {text: 'C++', link: '/语法入门/C++'},
                                {text: 'STL', link: '/语法入门/STL'},
                            ]
                        },
                    ],
                '/基础算法/':
                    [
                        {
                            text: '基础算法',
                            items: [
                                {text: '递归递推', link: '/基础算法/递归递推'},
                                {text: '排序', link: '/基础算法/排序'},
                                {text: '贪心', link: '/基础算法/贪心'},
                                {text: '二分', link: '/基础算法/二分'},
                                {text: '差分前缀和', link: '/基础算法/差分前缀和'},
                                {text: '倍增', link: '/基础算法/倍增'},
                            ]
                        },
                    ],
                '/搜索/':
                    [
                        {
                            text: '搜索',
                            items: [
                                {text: 'DFS', link: '/搜索/DFS'},
                                {text: 'BFS', link: '/搜索/BFS'},
                            ]
                        },
                    ],
                '/动态规划/':
                    [
                        {
                            text: '动态规划',
                            items: [
                                {text: '记忆化搜索与动态规划', link: '/动态规划/记忆化搜索与动态规划'},
                                {text: '背包', link: '/动态规划/背包'},
                                {text: '区间dp', link: '/动态规划/区间dp'},
                                {text: '树上dp', link: '/动态规划/树上dp'},
                                {text: '状态压缩dp', link: '/动态规划/状态压缩dp'},
                            ]
                        },
                    ],
                '/数据结构/':
                    [
                        {
                            text: '数据结构',
                            items: [
                                {text: '单调队列', link: '/数据结构/单调队列'},
                                {text: '分块', link: '/数据结构/分块'},
                                {text: '树状数组', link: '/数据结构/树状数组'},
                                {text: '线段树', link: '/数据结构/线段树'},
                                {text: '线段树与树状数组2', link: '/数据结构/线段树与树状数组2'},
                            ]
                        },
                    ],
                '/数学/':
                    [
                        {
                            text: '数学',
                            items: [
                                {text: '筛法和数论分块', link: '/数学/筛法和数论分块'},
                                {text: '乘法逆元和快速幂', link: '/数学/乘法逆元和快速幂'},
                                {text: '组合', link: '/数学/组合'},
                                {text: '博弈', link: '/数学/博弈'},
                                {text: '概率和期望', link: '/数学/概率和期望'},
                            ]
                        },
                    ],
                '/字符串/':
                    [
                        {
                            text: '字符串',
                            items: [
                                {text: '字符串基础及哈希', link: '/字符串/字符串基础及哈希'},
                                {text: 'kmp', link: '/字符串/kmp'},
                                {text: 'trie树', link: '/字符串/trie树'},
                            ]
                        },
                    ],
                '/图论/':
                    [
                        {
                            text: '图论',
                            items: [
                                {text: '拓扑排序', link: '/图论/拓扑排序'},
                                {text: '并查集', link: '/图论/并查集'},
                                {text: '生成树', link: '/图论/生成树'},
                                {text: '最短路', link: '/图论/最短路'},
                                {text: '最近公共祖先', link: '/图论/最近公共祖先'},
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
                            items: []
                        },
                    ],
            }
    }
}