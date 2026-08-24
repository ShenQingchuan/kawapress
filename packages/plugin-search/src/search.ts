import type { Options, SearchResult } from 'minisearch'
import MiniSearch from 'minisearch'

export interface SearchDocument {
  id: string
  title: string
  titles: string[]
  text: string
}

export type LocalSearchResult = SearchResult & SearchDocument

const CJK_OR_WORD_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[\p{Letter}\p{Number}]+/gu

export const searchIndexOptions: Options<SearchDocument> = {
  fields: ['title', 'titles', 'text'],
  storeFields: ['title', 'titles', 'text'],
  tokenize: tokenizeSearchText,
  processTerm: normalizeSearchTerm,
  searchOptions: {
    boost: { title: 4, titles: 2, text: 1 },
    combineWith: 'AND',
    fuzzy: term => term.length >= 5 ? 0.2 : false,
    prefix: true,
  },
}

export function createSearchIndex(
  documents: SearchDocument[] = [],
): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>(searchIndexOptions)
  index.addAll(documents)
  return index
}

export function loadSearchIndex(json: string): MiniSearch<SearchDocument> {
  return MiniSearch.loadJSON<SearchDocument>(json, searchIndexOptions)
}

export function tokenizeSearchText(text: string): string[] {
  return text.normalize('NFKC').match(CJK_OR_WORD_RE) ?? []
}

function normalizeSearchTerm(term: string): string | null {
  const normalized = term.toLocaleLowerCase()
  return normalized || null
}
