'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export interface DailyProd {
  day: string
  ok: number
  refugo: number
  retrabalho: number
}

export interface OpsStatusItem {
  label: string
  count: number
  color: string
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: '8px',
    border: '1px solid #374151',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    fontSize: '12px',
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
  },
  labelStyle: { fontWeight: 600, color: '#e5e7eb', marginBottom: 4 },
  itemStyle: { color: '#d1d5db' },
}

export function ProducaoSemanalChart({ data }: { data: DailyProd[] }) {
  const isEmpty = data.every((d) => d.ok === 0 && d.refugo === 0 && d.retrabalho === 0)

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-gray-400 dark:text-gray-600">
        Nenhum apontamento nos últimos 7 dias
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: '11px', color: '#d1d5db' }}>{value}</span>
          )}
        />
        <Bar dataKey="ok" name="Aprovadas" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="refugo" name="Refugo" fill="#ef4444" radius={[3, 3, 0, 0]} />
        <Bar dataKey="retrabalho" name="Retrabalho" fill="#f59e0b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const RADIAN = Math.PI / 180
function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx?: number; cy?: number; midAngle?: number
  innerRadius?: number; outerRadius?: number; percent?: number
}) {
  if (!percent || percent < 0.06) return null
  const ir = innerRadius ?? 0
  const or = outerRadius ?? 0
  const ma = midAngle ?? 0
  const radius = ir + (or - ir) * 0.5
  const x = (cx ?? 0) + radius * Math.cos(-ma * RADIAN)
  const y = (cy ?? 0) + radius * Math.sin(-ma * RADIAN)
  return (
    <text
      x={x} y={y} fill="white" textAnchor="middle"
      dominantBaseline="central" fontSize={10} fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function OpsStatusChart({ data }: { data: OpsStatusItem[] }) {
  const filtered = data.filter((d) => d.count > 0)

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-gray-400 dark:text-gray-600">
        Nenhuma ordem de produção
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
          dataKey="count"
          nameKey="label"
          labelLine={false}
          label={renderCustomLabel}
        >
          {filtered.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #374151', fontSize: '12px', backgroundColor: '#1f2937', color: '#f3f4f6' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: '11px', color: '#d1d5db' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
