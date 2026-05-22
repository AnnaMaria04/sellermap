"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { week: "W1", score: 62, margin: 19 },
  { week: "W2", score: 68, margin: 22 },
  { week: "W3", score: 71, margin: 24 },
  { week: "W4", score: 78, margin: 27 },
];

export function DashboardChart() {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="score" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0F7A4F" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#0F7A4F" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E6EAE6" vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Area
            dataKey="score"
            stroke="#0F7A4F"
            strokeWidth={2}
            fill="url(#score)"
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
