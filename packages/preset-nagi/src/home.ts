export interface NagiImageSource {
  src: string
  alt?: string
}

export interface NagiThemeableImage {
  light: string | NagiImageSource
  dark: string | NagiImageSource
  alt?: string
}

export type NagiHomeImage
  = string | NagiImageSource | NagiThemeableImage

export interface NagiHomeAction {
  text: string
  link: string
  theme?: 'brand' | 'alt'
  target?: string
  rel?: string
}

export interface NagiHomeHero {
  name?: string
  text?: string
  tagline?: string
  image?: NagiHomeImage
  actions?: NagiHomeAction[]
}

export interface NagiHomeFeature {
  icon?: string
  title: string
  details: string
  link?: string
  linkText?: string
  target?: string
  rel?: string
}

export interface NagiHomeFrontmatter {
  hero?: NagiHomeHero
  features?: NagiHomeFeature[]
}

export function isExternalLink(link: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(link)
}
