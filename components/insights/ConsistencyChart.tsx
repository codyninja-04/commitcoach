'use client'

import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ConsistencyPoint } from '@/lib/habits/stats'

const PRIMARY = '#059669'
const SERIES = ['#0284C7', '#EA580C', '#7C3AED', '#DB2777', '#CA8A04', '#0D9488', '#4F46E5']

interface TooltipEntry {
  dataKey?: string | number
  value?: number | null
  color?: string
}

/**
 * Weekly completion over the last twelve weeks. The overall line is the
 * headline. Per-habit lines are opt in so the default view stays readable.
 */
export function ConsistencyChart({
  data,
  habits,
}: {
  data: ConsistencyPoint[]
  habits: { id: string; name: string }[]
}) {
  const [showEach, setShowEach] = useState(false)
  const names = new Map(habits.map((h) => [h.id, h.name]))
  const hasData = data.some((d) => d.overall !== null)

  if (!hasData) {
    return (
      <div className="grid h-56 place-items-center rounded-xl bg-subtle/60 text-sm text-muted">
        The trend fills in after your first full week.
      </div>
    )
  }

  return (
    <div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.22} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#78716C' }}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#78716C' }}
            />
            <Tooltip
              cursor={{ stroke: '#A8A29E', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-xl border border-border bg-surface px-3 py-2 text-[12px] shadow-card">
                    <p className="mb-1 font-semibold">Week of {label}</p>
                    {(payload as TooltipEntry[]).map((p) => (
                      <p key={String(p.dataKey)} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-muted">
                          {p.dataKey === 'overall' ? 'Overall' : names.get(String(p.dataKey))}
                        </span>
                        <span className="ml-auto pl-3 font-semibold tabular-nums">
                          {p.value === null || p.value === undefined ? '--' : `${p.value}%`}
                        </span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="overall"
              stroke={PRIMARY}
              strokeWidth={2.5}
              fill="url(#overallFill)"
              connectNulls
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            {showEach &&
              habits.map((h, i) => (
                <Line
                  key={h.id}
                  type="monotone"
                  dataKey={h.id}
                  stroke={SERIES[i % SERIES.length]}
                  strokeWidth={1.5}
                  strokeOpacity={0.85}
                  dot={false}
                  connectNulls
                />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {habits.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setShowEach((s) => !s)}
            aria-pressed={showEach}
            className={`chip ${showEach ? 'chip-on' : ''}`}
          >
            {showEach ? 'Hide each habit' : 'Show each habit'}
          </button>
          {showEach &&
            habits.map((h, i) => (
              <span key={h.id} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                {h.name}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
