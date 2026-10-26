/**
 * Style tokens every KawaPress site has, no matter which theme is installed.
 * Plugins only read these names; themes override the values.
 */
export const KAWA_TOKEN_NAMES = [
  '--kawa-c-bg',
  '--kawa-c-bg-soft',
  '--kawa-c-bg-elv',
  '--kawa-c-border',
  '--kawa-c-divider',
  '--kawa-c-text-1',
  '--kawa-c-text-2',
  '--kawa-c-text-3',
  '--kawa-c-brand',
  '--kawa-c-info',
  '--kawa-c-success',
  '--kawa-c-warning',
  '--kawa-c-danger',
  '--kawa-font-sans',
  '--kawa-font-mono',
  '--kawa-radius',
  '--kawa-shadow-overlay',
] as const

export type KawaTokenName = typeof KAWA_TOKEN_NAMES[number]

/**
 * Style layers, lowest priority first. Site CSS written without a layer wins
 * over all three, so site authors override themes with plain CSS.
 */
export const KAWA_LAYER_ORDER = '@layer kawa.base, kawa.plugin, kawa.theme;'

/**
 * Neutral defaults emitted into every page. `light-dark()` follows the visitor's
 * color scheme; `color-scheme: light dark` must live in the same layer for the
 * function to resolve without a theme.
 */
export const KAWA_DEFAULT_TOKENS = `@layer kawa.base {
  :root {
    color-scheme: light dark;
    --kawa-c-bg: light-dark(#ffffff, #1b1b1f);
    --kawa-c-bg-soft: light-dark(#f6f6f7, #202127);
    --kawa-c-bg-elv: light-dark(#ffffff, #252530);
    --kawa-c-border: light-dark(#d4d4d8, #3c3c44);
    --kawa-c-divider: light-dark(#e2e2e3, #2e2e32);
    --kawa-c-text-1: light-dark(#1c1c1f, #f2f2f3);
    --kawa-c-text-2: light-dark(#4a4a52, #c3c3c9);
    --kawa-c-text-3: light-dark(#6e6e78, #8a8a93);
    --kawa-c-brand: light-dark(#2f5fbf, #7aa2f7);
    --kawa-c-info: light-dark(#0b6bcb, #4dabf7);
    --kawa-c-success: light-dark(#0f7b3f, #51cf66);
    --kawa-c-warning: light-dark(#8a5a00, #f0b429);
    --kawa-c-danger: light-dark(#b3261e, #ff7b72);
    --kawa-font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', sans-serif;
    --kawa-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    --kawa-radius: 6px;
    --kawa-shadow-overlay: 0 12px 32px light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.6));
  }
}`
