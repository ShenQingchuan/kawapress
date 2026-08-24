import type MiniSearch from 'minisearch'
import type { LocalSearchResult, SearchDocument } from '../search'
import { useLocale } from 'kawapress/client'
import { searchIndexLoaders } from 'virtual:kawapress-search-index'
import { computed, onScopeDispose, readonly, shallowRef, watch } from 'vue'

export type LocalSearchStatus = 'loading' | 'ready' | 'error'

export function useLocalSearch() {
  const { localeIndex } = useLocale()
  const query = shallowRef('')
  const index = shallowRef<MiniSearch<SearchDocument> | null>(null)
  const status = shallowRef<LocalSearchStatus>('loading')
  let requestId = 0
  let active = true

  const results = computed<LocalSearchResult[]>(() => {
    const value = query.value.trim()
    if (!value || !index.value) {
      return []
    }
    return index.value.search(value).slice(0, 12) as LocalSearchResult[]
  })

  async function load(): Promise<void> {
    const currentRequest = ++requestId
    status.value = 'loading'
    index.value = null

    try {
      const loader = searchIndexLoaders[localeIndex.value]
        ?? searchIndexLoaders.root
      if (!loader) {
        throw new Error(`Missing search index for locale ${JSON.stringify(localeIndex.value)}`)
      }
      const [{ loadSearchIndex }, indexModule] = await Promise.all([
        import('../search'),
        loader(),
      ])
      if (!active || currentRequest !== requestId) {
        return
      }
      index.value = loadSearchIndex(indexModule.default)
      status.value = 'ready'
    }
    catch (error) {
      if (!active || currentRequest !== requestId) {
        return
      }
      console.error('KawaPress: failed to load the local search index.', error)
      status.value = 'error'
    }
  }

  watch(localeIndex, load, { immediate: true })
  onScopeDispose(() => {
    active = false
  })

  return {
    query,
    results,
    status: readonly(status),
    load,
  }
}
