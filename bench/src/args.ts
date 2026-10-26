const DEFAULT_SIZES = [50, 500, 2000]
const DEFAULT_RUNS = 3
const MIN_SIZE = 3
const MAX_SIZE = 10_000

export interface RunOptions {
  /** Guide page counts to measure. */
  sizes: number[]
  /** Runs per measurement. */
  runs: number
  /** Whether to run Lighthouse as well. */
  lighthouse: boolean
}

export const USAGE = `Usage: pnpm bench [--sizes 50,500,2000] [--runs 3] [--lighthouse]

  --sizes       Comma separated guide page counts to measure (default: ${DEFAULT_SIZES.join(',')})
  --runs        Runs per measurement, the median is reported (default: ${DEFAULT_RUNS})
  --lighthouse  Also score the home page with Lighthouse (needs Chrome)`

/** Parse the benchmark CLI arguments; every invalid value explains how to fix it. */
export function parseArgs(argv: readonly string[]): RunOptions {
  const options: RunOptions = {
    sizes: [...DEFAULT_SIZES],
    runs: DEFAULT_RUNS,
    lighthouse: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!
    if (argument === '--lighthouse') {
      options.lighthouse = true
      continue
    }
    if (!argument.startsWith('--')) {
      throw new Error(`Benchmark: unexpected argument \`${argument}\`.\n\n${USAGE}`)
    }

    const [name, inlineValue] = splitOption(argument)
    if (name !== '--sizes' && name !== '--runs') {
      throw new Error(`Benchmark: unknown option \`${name}\`.\n\n${USAGE}`)
    }

    const value = inlineValue ?? argv[++index]
    if (value === undefined) {
      throw new Error(`Benchmark: \`${name}\` needs a value.\n\n${USAGE}`)
    }
    if (name === '--sizes') {
      options.sizes = parseSizes(value)
    }
    else {
      options.runs = parseRuns(value)
    }
  }

  return options
}

function splitOption(argument: string): [string, string | undefined] {
  const separator = argument.indexOf('=')
  return separator === -1
    ? [argument, undefined]
    : [argument.slice(0, separator), argument.slice(separator + 1)]
}

function parseSizes(value: string): number[] {
  const sizes = value.split(',').map((part) => {
    const size = Number(part.trim())
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
      throw new Error(
        `Benchmark: \`--sizes\` expects comma separated integers between ${MIN_SIZE} and ${MAX_SIZE}, got \`${value}\`.`,
      )
    }
    return size
  })
  return [...new Set(sizes)].sort((left, right) => left - right)
}

function parseRuns(value: string): number {
  const runs = Number(value.trim())
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(`Benchmark: \`--runs\` expects a positive integer, got \`${value}\`.`)
  }
  return runs
}
