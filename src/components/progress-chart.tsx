'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { subDays, format } from 'date-fns';

// --- MOCK DATA FOR DEMONSTRATION ---

// Mock data for Radar Chart (Topic Mastery)
const masteryData = [
  { subject: 'Eng. Mechanics', score: 85, fullMark: 100 },
  { subject: 'Strength of Mat.', score: 65, fullMark: 100 },
  { subject: 'Thermodynamics', score: 90, fullMark: 100 },
  { subject: 'Fluid Mechanics', score: 70, fullMark: 100 },
  { subject: 'Machine Design', score: 55, fullMark: 100 },
  { subject: 'Heat Transfer', score: 80, fullMark: 100 },
];

// Mock data for Heatmap (Learning Consistency - last 90 days)
const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    // Simulate activity: more activity on weekdays, less on weekends, random variation
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let count = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 8) + 1;
    // Add some randomly empty days for realism
    if (Math.random() > 0.8) count = 0;
    
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      count: count,
    });
  }
  return data;
};

const heatmapData = generateHeatmapData();

// Helper to get color based on activity count
const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900/50';
    if (count <= 5) return 'bg-emerald-400 dark:bg-emerald-700/50';
    return 'bg-emerald-600 dark:bg-emerald-500/50';
};


export function ProgressCharts() {
  const [chartTab, setChartTab] = useState('mastery');

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-none shadow-md overflow-hidden relative">
      <CardHeader className="pb-2 bg-white dark:bg-slate-900 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="text-xl font-bold">Performance Insights</CardTitle>
                <CardDescription>
                    Analyze your subject mastery and track your learning consistency.
                </CardDescription>
            </div>
            <Tabs value={chartTab} onValueChange={setChartTab} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="mastery">Topic Mastery</TabsTrigger>
                    <TabsTrigger value="consistency">Consistency</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-6 bg-slate-50 dark:bg-slate-950/50">
        
        {/* --- TAB 1: TOPIC MASTERY (RADAR CHART) --- */}
        <TabsContent value="mastery" className="mt-0 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={masteryData}>
              <PolarGrid className="text-slate-200 dark:text-slate-800" />
              <PolarAngleAxis dataKey="subject" className="text-xs font-medium fill-slate-600 dark:fill-slate-400" tick={{ dy: 4 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs fill-slate-400" tickCount={6} />
              <Radar
                name="My Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value) => [`${value}%`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </TabsContent>

        {/* --- TAB 2: LEARNING CONSISTENCY (HEATMAP) --- */}
        <TabsContent value="consistency" className="mt-0">
          <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                  {/* Legend */}
                  <div className="flex justify-end items-center text-sm text-muted-foreground px-1 gap-2">
                      <span>Less</span>
                      <div className="flex gap-1">
                          <div className={cn("w-3 h-3 rounded-sm", getHeatmapColor(0))} title="0 activities"/>
                          <div className={cn("w-3 h-3 rounded-sm", getHeatmapColor(2))} title="1-2 activities"/>
                          <div className={cn("w-3 h-3 rounded-sm", getHeatmapColor(5))} title="3-5 activities"/>
                          <div className={cn("w-3 h-3 rounded-sm", getHeatmapColor(8))} title="6+ activities"/>
                      </div>
                      <span>More</span>
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                      {heatmapData.map((day) => (
                          <div
                              key={day.date}
                              className={cn(
                                  "w-3 h-3 sm:w-4 sm:h-4 rounded-sm transition-colors hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-600",
                                  getHeatmapColor(day.count)
                              )}
                              title={`${day.date}: ${day.count} activities`}
                          />
                      ))}
                  </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Your daily learning activity over the last 90 days. Consistency is key!
              </p>
          </div>
        </TabsContent>

      </CardContent>
    </Card>
  );
}