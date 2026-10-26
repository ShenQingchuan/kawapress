import process from 'node:process'
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
