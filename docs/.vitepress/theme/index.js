import DefaultTheme from 'vitepress/theme';
import giscusTalk from 'vitepress-plugin-comment-with-giscus';
import {useData, useRoute} from 'vitepress';

export default {
  ...DefaultTheme,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp(ctx);
    // ...
  },
  setup() {
    // 获取前言和路由
    const {frontmatter} = useData();
    const route = useRoute();

    // 评论组件 - https://giscus.app/
    giscusTalk({
          repo: 'CCNU-ACM-Official/CCNU-ACM-Official.github.io',
          repoId: 'R_kgDOKVFFjg',
          category: 'Announcements', // 默认: `General`
          categoryId: 'DIC_kwDOKVFFjs4CcoEq',
          mapping: 'pathname', // 默认: `pathname`
          strict: "1",
          term: "Welcome to @giscus/vue component!",
          reactionsEnabled: "1",
          emitMetadata: "1",
          inputPosition: 'top', // 默认: `top`
          lang: 'zh-CN', // 默认: `zh-CN`
          lightTheme: 'light', // 默认: `light`
          darkTheme: 'dark', // 默认: `transparent_dark`
          // loading: "lazy",
          // ...
        }, {
          frontmatter, route
        },
        // 是否全部页面启动评论区。
        // 默认为 true，表示启用，此参数可忽略；
        // 如果为 false，表示不启用。
        // 可以在页面使用 `comment: true` 前言单独启用
        true
    );
  }
};