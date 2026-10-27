import process from 'node:process'
import commentsPlugin from '@kawapress/plugin-comments'
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'
import { sidebars } from './sidebar'

export default nagi({
  title: 'KawaPress',
  base: process.env.KAWAPRESS_BASE,
  plugins: [
    imageZoomPlugin(),
    commentsPlugin({
      // giscus 只读取 GitHub Discussions，站点本身不存任何评论数据。
      giscus: {
        repo: 'ShenQingchuan/kawapress',
        repoId: 'R_kgDOUBnCOQ',
        category: 'Announcements',
        categoryId: 'DIC_kwDOUBnCOc4DJuT-',
      },
    }),
    mathjaxPlugin(),
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://github.com/ShenQingchuan/kawapress/edit/main/:path',
      },
    }),
  ],
  themeConfig: {
    logo: {
      light: '/kawapress-logo.png',
      dark: '/kawapress-logo-dark.png',
      alt: 'KawaPress',
    },
    githubUrl: 'https://github.com/ShenQingchuan/kawapress',
    sidebar: sidebars.zhCN,
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
        sidebar: sidebars.en,
      },
    },
  },
})
