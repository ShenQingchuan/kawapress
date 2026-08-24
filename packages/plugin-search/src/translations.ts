export interface SearchTranslations {
  buttonLabel: string
  placeholder: string
  loadingLabel: string
  emptyLabel: string
  noResultsLabel: string
  errorLabel: string
  retryLabel: string
  navigateLabel: string
  selectLabel: string
  closeLabel: string
}

const EN_TRANSLATIONS: SearchTranslations = {
  buttonLabel: 'Search',
  placeholder: 'Search documentation',
  loadingLabel: 'Loading search index',
  emptyLabel: 'Type to search the documentation',
  noResultsLabel: 'No results found for',
  errorLabel: 'Search could not be loaded',
  retryLabel: 'Try again',
  navigateLabel: 'Navigate',
  selectLabel: 'Open',
  closeLabel: 'Close',
}

const ZH_TRANSLATIONS: SearchTranslations = {
  buttonLabel: '搜索',
  placeholder: '搜索文档',
  loadingLabel: '正在加载搜索索引',
  emptyLabel: '输入关键词开始搜索',
  noResultsLabel: '未找到相关内容',
  errorLabel: '无法加载搜索',
  retryLabel: '重试',
  navigateLabel: '切换结果',
  selectLabel: '打开',
  closeLabel: '关闭',
}

export function resolveSearchTranslations(
  translations: Partial<SearchTranslations> = {},
  lang = 'en',
): SearchTranslations {
  const defaults = lang.toLocaleLowerCase().startsWith('zh')
    ? ZH_TRANSLATIONS
    : EN_TRANSLATIONS
  return { ...defaults, ...translations }
}
