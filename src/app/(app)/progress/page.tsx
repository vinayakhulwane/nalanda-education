'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, documentId } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Flame, TrendingUp, AlertTriangle, Compass, Trophy, ArrowDownRight, Layers, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, differenceInDays } from 'date-fns';
import type { WorksheetAttempt, Unit, Category, Worksheet } from '@/types';

type PerformanceMetric = {
  id: string;
  name: string;
  type: 'unit' | 'category';
  parentName?: string; 
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  attemptCount: number;
};

export default function ProgressPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // 1. Fetch Attempts
  const attemptsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'worksheet_attempts'),
      where('userId', '==', user.uid),
      orderBy('attemptedAt', 'asc')
    );
  }, [user, firestore]);
  const { data: attempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);

  // 2. Fetch Metadata
  const { data: units } = useCollection<Unit>(useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]));
  const { data: categories } = useCollection<Category>(useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]));

  // 3. ✅ Fetch Worksheets (To fix missing unitIds in old data)
  // We fetch all worksheets to build a lookup map. In a large app, you'd filter this by IDs.
  const { data: allWorksheets } = useCollection<Worksheet>(useMemoFirebase(() => firestore ? collection(firestore, 'worksheets') : null, [firestore]));

  // --- ANALYTICS LOGIC ---
  const analytics = useMemo(() => {
    if (!attempts || !units || !categories || !allWorksheets) return null;

    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, unitId: c.unitId }]));
    
    // ✅ Create Worksheet Lookup Map
    const worksheetLookup = new Map(allWorksheets.map(w => [w.id, { unitId: w.unitId, subjectId: w.subjectId }]));

    const metricsMap = new Map<string, PerformanceMetric>();

    // Helper
    const getMetric = (id: string, name: string, type: 'unit' | 'category') => {
        const key = `${type}_${id}`;
        if (!metricsMap.has(key)) {
            metricsMap.set(key, { id, name, type, totalMarks: 0, obtainedMarks: 0, percentage: 0, attemptCount: 0 });
        }
        return metricsMap.get(key)!;
    };

    // Initialize all metrics
    units.forEach(u => getMetric(u.id, u.name, 'unit'));
    categories.forEach(c => {
        const m = getMetric(c.id, c.name, 'category');
        if (c.unitId && unitMap.has(c.unitId)) m.parentName = unitMap.get(c.unitId);
    });

    const attemptsByDate = new Map<string, { total: number, obtained: number }>();

    attempts.forEach(attempt => {
        let score = (attempt as any).score || 0;
        let total = (attempt as any).totalMarks || 0;
        
        // Robust Score Check
        if (total === 0) total = Math.max(score, 10); // Prevent 0 division

        // Date Aggregation
        if (attempt.attemptedAt) {
             const dateKey = format(attempt.attemptedAt.toDate(), 'yyyy-MM-dd');
             if (!attemptsByDate.has(dateKey)) attemptsByDate.set(dateKey, { total: 0, obtained: 0 });
             const dayStats = attemptsByDate.get(dateKey)!;
             dayStats.total += total;
             dayStats.obtained += score;
        }

        // ✅ LOOKUP MISSING UNIT ID
        // 1. Try direct property (new data)
        // 2. Try looking up the worksheet (old data)
        let unitId = (attempt as any).unitId;
        if (!unitId && attempt.worksheetId && worksheetLookup.has(attempt.worksheetId)) {
            unitId = worksheetLookup.get(attempt.worksheetId)?.unitId;
        }

        if (unitId && unitMap.has(unitId)) {
            const m = getMetric(unitId, unitMap.get(unitId)!, 'unit');
            m.attemptCount++;
            m.obtainedMarks += score;
            m.totalMarks += total;
        }

        const categoryId = (attempt as any).categoryId;
        if (categoryId && categoryMap.has(categoryId)) {
             const m = getMetric(categoryId, categoryMap.get(categoryId)!.name, 'category');
             m.attemptCount++;
             m.obtainedMarks += score;
             m.totalMarks += total;
        }
    });

    // Calculate Percentages
    metricsMap.forEach(m => {
        if (m.attemptCount > 0) m.percentage = (m.obtainedMarks / m.totalMarks) * 100;
    });

    // Streak Logic
    let currentStreak = 0;
    const sortedDates = Array.from(attemptsByDate.keys()).sort();
    if (sortedDates.length > 0) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const last = sortedDates[sortedDates.length - 1];
        if (last === today || last === yesterday) {
            currentStreak = 1;
            for (let i = sortedDates.length - 2; i >= 0; i--) {
                const curr = new Date(sortedDates[i]);
                const next = new Date(sortedDates[i+1]);
                if (differenceInDays(next, curr) === 1) currentStreak++;
                else break;
            }
        }
    }

    // Health Logic
    const healthChartData = [];
    let healthScore = 80; 
    for (let i = 13; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayStats = attemptsByDate.get(dateKey);
        if (dayStats) {
            const dayAvg = (dayStats.obtained / dayStats.total) * 100;
            healthScore = (healthScore * 0.6) + (dayAvg * 0.4);
        } else {
            healthScore = Math.max(0, healthScore * 0.95);
        }
        healthChartData.push({ date: format(date, 'MMM dd'), health: Math.round(healthScore) });
    }

    // Sort into buckets
    const unitMetrics = { strengths: [] as PerformanceMetric[], weaknesses: [] as PerformanceMetric[], unexplored: [] as PerformanceMetric[] };
    const catMetrics = { strengths: [] as PerformanceMetric[], weaknesses: [] as PerformanceMetric[], unexplored: [] as PerformanceMetric[] };

    metricsMap.forEach(m => {
        const target = m.type === 'unit' ? unitMetrics : catMetrics;
        if (m.attemptCount === 0) target.unexplored.push(m);
        else if (m.percentage >= 75) target.strengths.push(m);
        else if (m.percentage < 50) target.weaknesses.push(m);
    });

    const sortM = (list: PerformanceMetric[], asc = false) => list.sort((a, b) => asc ? a.percentage - b.percentage : b.percentage - a.percentage);
    [unitMetrics, catMetrics].forEach(g => { sortM(g.strengths); sortM(g.weaknesses, true); });

    return { streak: currentStreak, healthData: healthChartData, currentHealth: Math.round(healthScore), unitMetrics, catMetrics };
  }, [attempts, units, categories, allWorksheets]);

  if (attemptsLoading || !analytics) return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const InsightGrid = ({ data }: { data: typeof analytics.unitMetrics }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-green-600" /> Strengths</CardTitle>
                <CardDescription>Score &gt; 75%</CardDescription>
            </CardHeader>
            <CardContent>
                {data.strengths.length > 0 ? (
                    <div className="space-y-4">
                        {data.strengths.slice(0, 5).map(s => (
                            <div key={s.id} className="flex justify-between items-start">
                                <div className="flex flex-col truncate w-2/3">
                                    <span className="text-sm font-medium">{s.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                        <span className="uppercase font-bold tracking-wider">{s.type}</span>
                                        {s.type === 'category' && s.parentName && (
                                            <><span>•</span><span className="truncate">{s.parentName}</span></>
                                        )}
                                    </div>
                                </div>
                                <Badge className="bg-green-100 text-green-700 border-none">{Math.round(s.percentage)}%</Badge>
                            </div>
                        ))}
                    </div>
                ) : <div className="text-sm text-muted-foreground py-4 text-center">Keep practicing to build strengths!</div>}
            </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-red-600" /> Weaknesses</CardTitle>
                <CardDescription>Score &lt; 50%</CardDescription>
            </CardHeader>
            <CardContent>
                {data.weaknesses.length > 0 ? (
                    <div className="space-y-4">
                        {data.weaknesses.slice(0, 5).map(w => (
                            <div key={w.id} className="flex justify-between items-start">
                                <div className="flex flex-col truncate w-2/3">
                                    <span className="text-sm font-medium">{w.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                        <span className="uppercase font-bold tracking-wider">{w.type}</span>
                                        {w.type === 'category' && w.parentName && (
                                            <><span>•</span><span className="truncate">{w.parentName}</span></>
                                        )}
                                    </div>
                                </div>
                                <Badge className="bg-red-100 text-red-700 border-none">{Math.round(w.percentage)}%</Badge>
                            </div>
                        ))}
                    </div>
                ) : <div className="text-sm text-muted-foreground py-4 text-center">No weaknesses found. Great job!</div>}
            </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Compass className="h-5 w-5 text-slate-600" /> Unexplored</CardTitle>
                <CardDescription>Not yet attempted</CardDescription>
            </CardHeader>
            <CardContent>
                {data.unexplored.length > 0 ? (
                    <div className="space-y-4">
                        {data.unexplored.slice(0, 5).map(u => (
                            <div key={u.id} className="flex justify-between items-center">
                                <div className="flex flex-col truncate w-2/3">
                                    <span className="text-sm font-medium text-muted-foreground">{u.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                        <span className="uppercase font-bold tracking-wider opacity-70">{u.type}</span>
                                        {u.type === 'category' && u.parentName && (
                                            <><span>•</span><span className="truncate opacity-70">{u.parentName}</span></>
                                        )}
                                    </div>
                                </div>
                                <ArrowDownRight className="h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                        ))}
                        {data.unexplored.length > 5 && <p className="text-xs text-center text-muted-foreground pt-2">+{data.unexplored.length - 5} more</p>}
                    </div>
                ) : <div className="text-sm text-muted-foreground py-4 text-center">All topics explored!</div>}
            </CardContent>
        </Card>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
        <p className="text-muted-foreground">Track your academic health, consistency, and mastery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Day Streak</CardTitle></CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-orange-600 flex items-baseline gap-2">{analytics.streak} <span className="text-lg font-normal text-muted-foreground">days</span></div>
                <p className="text-xs text-muted-foreground mt-2">{analytics.streak > 0 ? "You're on fire!" : "Start practicing to build your streak."}</p>
            </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Academic Health</CardTitle></CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-blue-600 flex items-baseline gap-2">{analytics.currentHealth}%</div>
                <Progress value={analytics.currentHealth} className="h-2 mt-3 [&>div]:bg-blue-600" />
                <p className="text-xs text-muted-foreground mt-2">Based on consistency and scores.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Total Worksheets</CardTitle></CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-foreground">{attempts?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">Completed since joining.</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Academic Health Trend</CardTitle><CardDescription>14-day history. Missed days reduce health. Practice restores it.</CardDescription></CardHeader>
        <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.healthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="health" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="unit" className="w-full">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Detailed Insights</h2>
            <TabsList>
                <TabsTrigger value="unit" className="flex items-center gap-2"><Layers className="h-4 w-4"/> By Unit</TabsTrigger>
                <TabsTrigger value="category" className="flex items-center gap-2"><Tag className="h-4 w-4"/> By Category</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="unit"><InsightGrid data={analytics.unitMetrics} /></TabsContent>
        <TabsContent value="category"><InsightGrid data={analytics.catMetrics} /></TabsContent>
      </Tabs>
    </div>
  );
}