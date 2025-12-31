'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import { Zap } from "lucide-react";

// MOCK DATA: This would eventually come from aggregating 'worksheet_attempts' in Firestore
const activityData = [
  { day: "Mon", score: 12 },
  { day: "Tue", score: 25 },
  { day: "Wed", score: 18 },
  { day: "Thu", score: 30 },
  { day: "Fri", score: 45 }, // Peak activity
  { day: "Sat", score: 10 },
  { day: "Sun", score: 5 },
];

export function ActivityChart() {
  // Calculate total for the subtitle
  const totalQuestions = activityData.reduce((acc, curr) => acc + curr.score, 0);

  return (
    <Card className="flex flex-col border-none shadow-md bg-white dark:bg-slate-900 h-full relative overflow-hidden">
      {/* Header Section */}
      <CardHeader className="pb-2 z-10">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Weekly Momentum
                </CardTitle>
                <div className="mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</span>
                    <span className="text-xs text-slate-400 ml-1 font-medium">questions solved</span>
                </div>
            </div>
        </div>
      </CardHeader>

      {/* Chart Section */}
      <CardContent className="flex-1 pb-0 pl-0 pr-0 min-h-[120px]">
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                {/* Custom Tooltip */}
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                        return (
                            <div className="bg-slate-900 text-white text-xs rounded py-1 px-2 shadow-xl">
                                <span className="font-bold">{payload[0].value}</span> questions
                            </div>
                        );
                        }
                        return null;
                    }}
                />
                
                {/* X-Axis Labels */}
                <XAxis 
                    dataKey="day" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    dy={10}
                />

                {/* Bars with Gradient-like Effect using Cell */}
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={24}>
                    {activityData.map((entry, index) => {
                        // Highlight current day (e.g., Friday) or make darker based on value
                        const isHighActivity = entry.score > 20;
                        return (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={isHighActivity ? "#6366f1" : "#e2e8f0"} // Indigo-500 vs Slate-200
                                className="dark:fill-indigo-500/50 dark:data-[high=true]:fill-indigo-500" 
                            />
                        );
                    })}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
