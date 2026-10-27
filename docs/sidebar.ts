import { defineLocalizedSidebars } from 'kawapress/nagi'

const locales = {
  zhCN: '',
  en: '/en',
}

/** 「指南」分区：写站点需要的内容，与具体插件无关。 */
export const guideSidebars = defineLocalizedSidebars({
  locales,
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
            zhCN: '面向 AI 的文档',
            en: 'AI-Ready Documentation',
          },
          link: '/guide/ai-ready-documentation',
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
        {
          text: {
            zhCN: '国际化',
            en: 'Internationalization',
          },
          link: '/guide/internationalization',
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
            zhCN: '构建时数据加载',
            en: 'Build-Time Data Loading',
          },
          link: '/guide/data-loading',
        },
        {
          text: {
            zhCN: '主题定制',
            en: 'Theme Customization',
          },
          link: '/guide/theme-customization',
        },
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

/** 「插件」分区：先讲插件体系，再列出官方插件。 */
export const pluginSidebars = defineLocalizedSidebars({
  locales,
  items: [
    {
      text: {
        zhCN: '编写插件',
        en: 'Writing Plugins',
      },
      items: [
        {
          text: {
            zhCN: '插件体系',
            en: 'Plugin System',
          },
          link: '/plugins/plugin-system',
        },
        {
          text: {
            zhCN: '插件开发',
            en: 'Plugin Development',
          },
          link: '/plugins/plugin-development',
        },
      ],
    },
    {
      text: {
        zhCN: '官方插件',
        en: 'Official Plugins',
      },
      items: [
        {
          text: {
            zhCN: '总览',
            en: 'Overview',
          },
          link: '/plugins/overview',
        },
        {
          text: {
            zhCN: 'Mermaid 图表',
            en: 'Mermaid',
          },
          link: '/plugins/mermaid',
        },
        {
          text: {
            zhCN: '图片缩放',
            en: 'Image Zoom',
          },
          link: '/plugins/image-zoom',
        },
        {
          text: {
            zhCN: '最后更新时间',
            en: 'Last Updated',
          },
          link: '/plugins/last-updated',
        },
        {
          text: {
            zhCN: '评论',
            en: 'Comments',
          },
          link: '/plugins/comments',
        },
        {
          text: {
            zhCN: '站点地图',
            en: 'Sitemap',
          },
          link: '/plugins/sitemap',
        },
      ],
    },
  ],
})
