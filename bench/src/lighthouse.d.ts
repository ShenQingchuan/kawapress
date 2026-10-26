/**
 * The `lighthouse` package ships types under `types/` but does not point
 * `package.json` at them, so only the surface used by the benchmark is declared here.
 */
declare module 'lighthouse' {
  export interface LighthouseCategoryResult {
    score: number | null
  }

  export interface LighthouseRun {
    lhr: {
      categories: Record<string, LighthouseCategoryResult | undefined>
    }
  }

  export default function lighthouse(
    url: string,
    flags?: Record<string, unknown>,
  ): Promise<LighthouseRun | undefined>
}
