"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", score: 78 },
  { month: "February", score: 82 },
  { month: "March", score: 75 },
  { month: "April", score: 85 },
  { month: "May", score: 88 },
  { month: "June", score: 91 },
]

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function ProgressChart() {
  return (
    <div className="h-[300px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={chartData}>
                <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                />
                <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="score" fill="var(--color-score)" radius={4} />
            </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
  )
}
