// Self-check for cutCheck: node lib/progress.test.mjs
// Mirrors the logic in progress.ts (kept in sync by hand — it's ~40 lines).
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const src = readFileSync(new URL('./progress.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { cutCheck } = await import('data:text/javascript,' + encodeURIComponent(js))

// Builds a series that loses `perWeek` lb/week over `days` days.
const series = (start, perWeek, days) =>
  Array.from({ length: days }, (_, i) => Math.round((start + (perWeek / 7) * i) * 10) / 10)

// Too few entries → asks for more data
assert.equal(cutCheck(series(180, -1, 5)).status, 'need-data')
assert.equal(cutCheck([]).status, 'need-data')

// Steady 1 lb/week loss over 3 weeks → on pace
assert.equal(cutCheck(series(180, -1, 21)).status, 'on-pace')

// Flat for 3 weeks → stalled (the 2-week rule fires)
assert.equal(cutCheck(series(180, 0, 21)).status, 'stalled')

// Gaining → also stalled (loss has stopped)
assert.equal(cutCheck(series(180, +0.5, 21)).status, 'stalled')

// 3 lb/week → too fast
assert.equal(cutCheck(series(200, -3, 21)).status, 'too-fast')

// 0.3 lb/week → moving but slow
assert.equal(cutCheck(series(180, -0.3, 21)).status, 'slow')

// Rate is reported as a negative number when losing
const onPace = cutCheck(series(180, -1, 21))
assert.ok(onPace.ratePerWeek < 0, 'losing weight should report a negative rate')
assert.ok(onPace.headline.length > 0 && onPace.detail.length > 0)

console.log('cutCheck: all 9 checks passed')
