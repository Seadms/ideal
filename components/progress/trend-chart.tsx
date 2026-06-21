// Minimal dependency-free SVG line chart with an optional overlay series
// (e.g. a rolling average). Pure render — safe in server or client components.

interface TrendChartProps {
  id: string                 // unique, stable id (gradient defs)
  values: number[]           // primary series, chronological
  overlay?: number[]         // optional same-length overlay series
  color?: string             // primary stroke (hex)
  overlayColor?: string
  height?: number
  yMin?: number
  yMax?: number
  integer?: boolean          // step gridlines as integers (benchmarks)
}

const W = 100 // viewBox width (stretched to container via preserveAspectRatio)

export function TrendChart({
  id,
  values,
  overlay,
  color = '#818cf8',
  overlayColor = '#fbbf24',
  height = 72,
  yMin,
  yMax,
  integer = false,
}: TrendChartProps) {
  if (values.length === 0) return null

  const all = overlay ? [...values, ...overlay] : values
  let lo = yMin ?? Math.min(...all)
  let hi = yMax ?? Math.max(...all)
  if (lo === hi) { lo -= integer ? 1 : 1; hi += integer ? 1 : 1 } // avoid divide-by-zero on flat data
  const pad = (hi - lo) * 0.12
  lo -= pad; hi += pad

  const H = height
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W)
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H

  const toPath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')

  const linePath = toPath(values)
  const areaPath = `${linePath} L ${x(values.length - 1).toFixed(2)} ${H} L ${x(0).toFixed(2)} ${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: `${H}px` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#grad-${id})`} />

      {overlay && overlay.length > 1 && (
        <path
          d={toPath(overlay)}
          fill="none"
          stroke={overlayColor}
          strokeWidth="1.2"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* End-point dot (and the sole point when there's just one entry) */}
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r="2"
        fill={color}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
