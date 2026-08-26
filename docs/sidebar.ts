import { defineLocalizedSidebars } from 'kawapress/nagi'

export const sidebars = defineLocalizedSidebars({
  locales: {
    zhCN: '',
    en: '/en',
  },
  items: [
    {
      text: {
        zhCN: '介绍',
        en: 'Introduction',
      },
      items: [
        {
          text: {
            zhCN: 'KawaPress 是什么？',
            en: 'What is KawaPress?',
          },
          link: '/guide/what-is-kawapress',
        },
        {
          text: {
            zhCN: '快速开始',
            en: 'Getting Started',
          },
          link: '/guide/getting-started',
        },
        {
          text: {
            zhCN: '路由',
            en: 'Routing',
          },
          link: '/guide/routing',
        },
        {
          text: {
            zhCN: '部署',
            en: 'Deploy',
          },
          link: '/guide/deploy',
        },
      ],
    },
    {
      text: {
        zhCN: '写作',
        en: 'Writing',
      },
      items: [
        {
          text: {
            zhCN: 'Markdown 语法扩展',
            en: 'Markdown Extensions',
          },
          link: '/guide/markdown-extensions',
        },
        {
          text: {
            zhCN: '静态资源处理',
            en: 'Asset Handling',
          },
          link: '/guide/asset-handling',
        },
        {
          text: {
            zhCN: 'Frontmatter',
            en: 'Frontmatter',
          },
          link: '/guide/frontmatter',
        },
        {
          text: {
            zhCN: '在 Markdown 中使用 Vue',
            en: 'Using Vue in Markdown',
          },
          link: '/guide/using-vue-in-markdown',
        },
      ],
    },
    {
      text: {
        zhCN: '自定义',
        en: 'Customization',
      },
      items: [
        {
          text: {
            zhCN: 'SSR 兼容性',
            en: 'SSR Compatibility',
          },
          link: '/guide/ssr-compatibility',
        },
      ],
    },
  ],
})
