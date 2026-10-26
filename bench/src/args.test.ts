import { describe, expect, it } from 'vitest'
import { parseArgs } from './args.ts'

describe('parseArgs', () => {
  it('defaults to the three report sizes and three runs', () => {
    expect(parseArgs([])).toEqual({
      sizes: [50, 500, 2000],
      runs: 3,
      lighthouse: false,
    })
  })

  it('reads sizes, runs and the Lighthouse flag', () => {
    expect(parseArgs(['--sizes', '50,500', '--runs', '5', '--lighthouse'])).toEqual({
      sizes: [50, 500],
      runs: 5,
      lighthouse: true,
    })
  })

  it('accepts the inline `--option=value` form and sorts sizes', () => {
    expect(parseArgs(['--sizes=500,50,50', '--runs=1'])).toEqual({
      sizes: [50, 500],
      runs: 1,
      lighthouse: false,
    })
  })

  it('explains how to fix invalid values', () => {
    expect(() => parseArgs(['--sizes', '1'])).toThrowError(/at least|between 3 and 10000/)
    expect(() => parseArgs(['--runs', '0'])).toThrowError(/positive integer/)
    expect(() => parseArgs(['--sizes'])).toThrowError(/needs a value/)
    expect(() => parseArgs(['--jobs', '2'])).toThrowError(/unknown option `--jobs`/)
    expect(() => parseArgs(['extra'])).toThrowError(/unexpected argument `extra`/)
  })
})
