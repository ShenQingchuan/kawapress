import process from 'node:process'
import commentsPlugin from '@kawapress/plugin-comments'
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import mermaidPlugin from '@kawapress/plugin-mermaid'
import { nagi } from 'kawapress/nagi'
import { guideSidebars, pluginSidebars } from './sidebar'

export default nagi({
  title: 'KawaPress',
  base: process.env.KAWAPRESS_BASE,
  plugins: [
    imageZoomPlugin(),
    mathjaxPlugin(),
    mermaidPlugin(),
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://github.com/kawapress/kawapress/edit/main/:path',
      },
    }),
    commentsPlugin({
      // giscus 只读取 GitHub Discussions，站点本身不存任何评论数据。
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_kgDOUBnCOQ',
        category: 'Announcements',
        categoryId: 'DIC_kwDOUBnCOc4DJuT-',
      },
    }),
  ],
  themeConfig: {
    logo: {
      light: '/kawapress-logo.png',
      dark: '/kawapress-logo-dark.png',
      alt: 'KawaPress',
    },
    githubUrl: 'https://github.com/kawapress/kawapress',
    nav: [
      { text: '指南', link: '/guide/what-is-kawapress', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/plugin-system', activeMatch: '/plugins' },
    ],
    sidebar: {
      '/guide/': guideSidebars.zhCN,
      '/plugins/': pluginSidebars.zhCN,
    },
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/what-is-kawapress', activeMatch: '/en/guide' },
          { text: 'Plugins', link: '/en/plugins/plugin-system', activeMatch: '/en/plugins' },
        ],
        sidebar: {
          '/en/guide/': guideSidebars.en,
          '/en/plugins/': pluginSidebars.en,
        },
      },
    },
  },
})
