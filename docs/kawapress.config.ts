import process from 'node:process'
import { nagi } from 'kawapress/nagi'
import { sidebars } from './sidebar'

export default nagi({
  title: 'KawaPress',
  base: process.env.KAWAPRESS_BASE,
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
