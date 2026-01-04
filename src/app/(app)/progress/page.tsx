'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Subject, WorksheetAttempt, Unit, Category, Worksheet } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from '@/components/page-header';
import { Loader2, BookOpen, ChevronLeft, Flame, TrendingUp, AlertTriangle, Compass, Trophy, ArrowDownRight, Layers, Tag, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { StudentAttemptHistory } from '@/components/user-management/student-attempt-history';
import { useAcademicHealth } from '@/hooks/use-academic-health';

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

const getAttemptTotals = (a: WorksheetAttempt, worksheet: Worksheet | undefined, allQuestions: Map<string, any>) => {
    const savedScore = (a as any).score;
    const savedTotal = (a as any).totalMarks;

    if (typeof savedScore === 'number' && typeof savedTotal === 'number' && savedTotal > 0) {
        if (savedScore > savedTotal) {
            return { score: (savedScore / 100) * savedTotal, total: savedTotal };
        }
        return { score: savedScore, total: savedTotal };
    }

    let calcScore = 0;
    let calcTotal = 0;
    const results = a.results || {};

    if (worksheet) {
        worksheet.questions.forEach(qId => {
            const question = allQuestions.get(qId);
            if (question) {
                const qMax = question.solutionSteps?.reduce((acc: number, s: any) => acc + s.subQuestions.reduce((ss: number, sub: any) => ss + (sub.marks || 0), 0), 0) || 0;
                calcTotal += qMax;

                let qEarned = 0;
                question.solutionSteps?.forEach((step: any) => {
                    step.subQuestions.forEach((sub: any) => {
                        const res = results[sub.id];
                        if (res) {
                            if (typeof res.score === 'number') qEarned += res.score;
                            else if (res.isCorrect) qEarned += (sub.marks || 0);
                        }
                    });
                });

                if (qEarned > qMax && qMax > 0) {
                    qEarned = (qEarned / 100) * qMax;
                }
                calcScore += qEarned;
            }
        });
    }

    if (calcTotal > 0) return { score: calcScore, total: calcTotal };
    return null;
};

export default function ProgressPage() {
    const { user, userProfile, isUserProfileLoading } = useUser();
    const firestore = useFirestore();
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

    const academicHealth = useAcademicHealth(userProfile!);

    // --- DATA FETCHING ---
    const enrolledSubjectsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.enrollments || userProfile.enrollments.length === 0) return null;
        return query(collection(firestore, 'subjects'), where(documentId(), 'in', userProfile.enrollments.slice(0, 30)));
    }, [firestore, userProfile?.enrollments]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(enrolledSubjectsQuery);

    const attemptsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'worksheet_attempts'), where('userId', '==', user.uid), orderBy('attemptedAt', 'asc'));
    }, [user, firestore]);
    const { data: attempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);

    const { data: units } = useCollection<Unit>(useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]));
    const { data: categories } = useCollection<Category>(useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]));
    const { data: allWorksheets } = useCollection<Worksheet>(useMemoFirebase(() => firestore ? collection(firestore, 'worksheets') : null, [firestore]));
    const { data: allQuestions } = useCollection<any>(useMemoFirebase(() => firestore ? collection(firestore, 'questions') : null, [firestore]));

    // --- DATA PROCESSING ---
    const lookups = useMemo(() => {
        if (!units || !categories || !allWorksheets || !allQuestions) return null;
        return {
            unitMap: new Map(units.map(u => [u.id, u])),
            categoryMap: new Map(categories.map(c => [c.id, c])),
            worksheetMap: new Map(allWorksheets.map(w => [w.id, w])),
            questionMap: new Map(allQuestions.map(q => [q.id, q])),
        };
    }, [units, categories, allWorksheets, allQuestions]);

    const subjectStats = useMemo(() => {
        if (!subjects || !attempts || !lookups) return {};
        const stats: Record<string, { total: number, obtained: number, count: number }> = {};
        subjects.forEach(s => stats[s.id] = { total: 0, obtained: 0, count: 0 });

        attempts.forEach(a => {
            const w = lookups.worksheetMap.get(a.worksheetId);
            if (w && stats[w.subjectId]) {
                const data = getAttemptTotals(a, w, lookups.questionMap);
                if (data) {
                    const { score, total } = data;
                    stats[w.subjectId].obtained += score;
                    stats[w.subjectId].total += total;
                    stats[w.subjectId].count++;
                }
            }
        });
        return stats;
    }, [subjects, attempts, lookups]);

    // --- DETAILED ANALYTICS ---
    const analytics = useMemo(() => {
        if (!attempts || !lookups || !selectedSubjectId) return null;
        const { unitMap, categoryMap, worksheetMap, questionMap } = lookups;

        const activeUnits = Array.from(unitMap.values()).filter(u => u.subjectId === selectedSubjectId);
        const activeUnitIds = new Set(activeUnits.map(u => u.id));

        const metricsMap = new Map<string, PerformanceMetric>();
        activeUnits.forEach(u => metricsMap.set(`unit_${u.id}`, { id: u.id, name: u.name, type: 'unit', totalMarks: 0, obtainedMarks: 0, percentage: 0, attemptCount: 0 }));

        const attemptsByDate = new Map<string, { total: number, obtained: number }>();

        attempts.forEach(attempt => {
            const worksheet = worksheetMap.get(attempt.worksheetId);
            if (!worksheet || worksheet.subjectId !== selectedSubjectId) return;

            const data = getAttemptTotals(attempt, worksheet, questionMap);
            if (!data) return;

            const { score, total } = data;

            if (attempt.attemptedAt) {
                const dateKey = format(attempt.attemptedAt.toDate(), 'yyyy-MM-dd');
                if (!attemptsByDate.has(dateKey)) attemptsByDate.set(dateKey, { total: 0, obtained: 0 });
                const d = attemptsByDate.get(dateKey)!;
                d.total += total; d.obtained += score;
            }

            worksheet.questions.forEach(qId => {
                const question = questionMap.get(qId);
                if (!question) return;

                let qMax = 0;
                let qScore = 0;

                question.solutionSteps?.forEach((step: any) => {
                    step.subQuestions.forEach((sub: any) => {
                        const m = sub.marks || 0;
                        qMax += m;
                        const res = attempt.results?.[sub.id];
                        if (res) {
                            if (typeof res.score === 'number') qScore += res.score;
                            else if (res.isCorrect) qScore += m;
                        }
                    });
                });

                if (qScore > qMax && qMax > 0) qScore = (qScore / 100) * qMax;

                const targetUnitId = question.unitId || worksheet.unitId;

                if (targetUnitId && activeUnitIds.has(targetUnitId)) {
                    const m = metricsMap.get(`unit_${targetUnitId}`);
                    if (m) {
                        m.attemptCount++;
                        m.totalMarks += qMax;
                        m.obtainedMarks += qScore;
                    }
                }

                if (question.categoryId) {
                    const c = categoryMap.get(question.categoryId);
                    if (c && c.unitId && activeUnitIds.has(c.unitId)) {
                        const key = `category_${c.id}`;
                        if (!metricsMap.has(key)) {
                            metricsMap.set(key, { id: c.id, name: c.name, type: 'category', parentName: unitMap.get(c.unitId)?.name, totalMarks: 0, obtainedMarks: 0, percentage: 0, attemptCount: 0 });
                        }
                        const mCat = metricsMap.get(key)!;
                        mCat.attemptCount++;
                        mCat.totalMarks += qMax;
                        mCat.obtainedMarks += qScore;
                    }
                }
            });
        });

        metricsMap.forEach(m => {
            if (m.totalMarks > 0) {
                m.percentage = Math.min(100, (m.obtainedMarks / m.totalMarks) * 100);
            }
        });

        let currentStreak = 0;
        const sortedDates = Array.from(attemptsByDate.keys()).sort();
        if (sortedDates.length > 0) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
            const last = sortedDates[sortedDates.length - 1];
            if (last === today || last === yesterday) {
                currentStreak = 1;
                for (let i = sortedDates.length - 2; i >= 0; i--) {
                    const diff = differenceInDays(new Date(sortedDates[i + 1]), new Date(sortedDates[i]));
                    if (diff === 1) currentStreak++; else break;
                }
            }
        }

        const healthChartData = [];
        let healthScore = academicHealth;

        for (let i = 13; i >= 0; i--) {
            const dateKey = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const dayStats = attemptsByDate.get(dateKey);
            if (dayStats && dayStats.total > 0) {
                const dayAvg = Math.min(100, (dayStats.obtained / dayStats.total) * 100);
                healthScore = (healthScore * 0.6) + (dayAvg * 0.4);
            } else {
                healthScore = Math.max(0, healthScore * 0.95);
            }
            healthChartData.push({ date: format(subDays(new Date(), i), 'MMM dd'), health: Math.round(healthScore) });
        }

        const unitMetrics = { strengths: [] as PerformanceMetric[], weaknesses: [] as PerformanceMetric[], unexplored: [] as PerformanceMetric[] };
        const catMetrics = { strengths: [] as PerformanceMetric[], weaknesses: [] as PerformanceMetric[], unexplored: [] as PerformanceMetric[] };

        metricsMap.forEach(m => {
            const target = m.type === 'unit' ? unitMetrics : catMetrics;
            if (m.attemptCount === 0) {
                target.unexplored.push(m);
            }
            else if (m.percentage >= 75) {
                target.strengths.push(m);
            }
            else if (m.percentage <= 50) {
                target.weaknesses.push(m);
            }
        });

        const sortM = (list: PerformanceMetric[], asc = false) => list.sort((a, b) => asc ? a.percentage - b.percentage : b.percentage - a.percentage);
        [unitMetrics, catMetrics].forEach(g => { sortM(g.strengths); sortM(g.weaknesses, true); });

        return {
            streak: currentStreak,
            healthData: healthChartData,
            currentHealth: Math.round(healthScore),
            unitMetrics,
            catMetrics,
            activeAttemptsCount: attempts.filter(a => lookups.worksheetMap.get(a.worksheetId)?.subjectId === selectedSubjectId).length
        };
    }, [attempts, lookups, selectedSubjectId, academicHealth]);

    const isLoading = isUserProfileLoading || subjectsLoading || attemptsLoading || !lookups;

    // ... inside ProgressPage component ...

    // 1. Define the type for the data prop explicitly
    type MetricsGroup = { 
      strengths: PerformanceMetric[]; 
      weaknesses: PerformanceMetric[]; 
      unexplored: PerformanceMetric[]; 
  };

  // 2. Use this type instead of 'typeof analytics.unitMetrics'
  const InsightGrid = ({ data }: { data: MetricsGroup }) => (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-green-600" /> Strengths</CardTitle>
                  <CardDescription>Score &ge; 75%</CardDescription>
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
                                          {s.type === 'category' && s.parentName && (<><span>•</span><span className="truncate">{s.parentName}</span></>)}
                                      </div>
                                  </div>
                                  <Badge className="bg-green-100 text-green-700 border-none">{Math.round(s.percentage)}%</Badge>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-sm text-muted-foreground py-4 text-center">Keep practicing to find your strengths!</div>}
              </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-red-600" /> Weaknesses</CardTitle>
                  <CardDescription>Score &le; 50%</CardDescription>
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
                                          {w.type === 'category' && w.parentName && (<><span>•</span><span className="truncate">{w.parentName}</span></>)}
                                      </div>
                                  </div>
                                  <Badge className="bg-red-100 text-red-700 border-none">{Math.round(w.percentage)}%</Badge>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-sm text-muted-foreground py-4 text-center">No major weaknesses found!</div>}
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
                                          {u.type === 'category' && u.parentName && (<><span>•</span><span className="truncate opacity-70">{u.parentName}</span></>)}
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

    // --- VIEW 1: SUBJECT SELECTION LIST ---
    if (!selectedSubjectId) {
        return (
            <div className="w-full max-w-[100vw] overflow-x-hidden p-4 pb-24 lg:p-6 lg:pb-6 space-y-6">
                <PageHeader title="My Progress" description="Your academic journey overview." />
                
                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-4">
                        {subjects && subjects.length > 0 ? (
                            <>
                                {/* Mobile View: List */}
                                <div className="md:hidden flex flex-col gap-3">
                                    {subjects.map((subject) => {
                                        const health = academicHealth;
                                        const healthColor = health > 75 ? "text-green-500" : health > 50 ? "text-yellow-500" : "text-primary";
                                        return (
                                            <div 
                                                key={subject.id} 
                                                onClick={() => setSelectedSubjectId(subject.id)}
                                                className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <BookOpen className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-base">{subject.name}</h3>
                                                        <p className="text-xs text-muted-foreground">{subjectStats[subject.id]?.count || 0} Worksheets</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <span className={cn("text-lg font-black", healthColor)}>{health}%</span>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Health</p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop View: Grid (Restored) */}
                                <div className="hidden md:grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {subjects.map((subject) => {
                                        const health = academicHealth;
                                        const healthColor = health > 75 ? "bg-green-500" : health > 50 ? "bg-yellow-500" : "bg-primary";
                                        return (
                                            <Card key={subject.id} className="hover:shadow-md transition-shadow">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{subject.name}</CardTitle>
                                                    <CardDescription>{subjectStats[subject.id]?.count || 0} Worksheets Completed</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Academic Health</span>
                                                            <span className="font-bold">{health}%</span>
                                                        </div>
                                                        <Progress value={health} className={cn("h-2 [&>div]:transition-all [&>div]:duration-500")} indicatorClassName={healthColor} />
                                                    </div>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button variant="secondary" className="w-full" onClick={() => setSelectedSubjectId(subject.id)}>View Details</Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">You are not enrolled in any subjects yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (!analytics || !userProfile) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const selectedSubjectName = subjects?.find(s => s.id === selectedSubjectId)?.name || 'Subject';

    return (
        <div className="w-full max-w-[100vw] overflow-x-hidden bg-slate-50/50 dark:bg-slate-950 min-h-screen">
            
            {/* 1. Mobile Top Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => setSelectedSubjectId(null)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="font-bold text-lg truncate">{selectedSubjectName}</h1>
            </div>

            <div className="p-4 pb-24 md:p-8 space-y-6 md:space-y-8">
                
                {/* 2. Key Stats (Mobile Horizontal / Desktop Grid) */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:grid md:grid-cols-3 md:gap-6 md:mx-0 md:px-0">
                     <div className="shrink-0 w-32 md:w-auto bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 text-orange-500 mb-2">
                            <Flame className="h-4 w-4 md:h-5 md:w-5" /> <span className="text-xs md:text-sm font-bold uppercase">Streak</span>
                        </div>
                        <span className="text-2xl md:text-4xl font-black">{analytics.streak}</span> <span className="text-xs md:text-lg text-muted-foreground">days</span>
                     </div>
                     <div className="shrink-0 w-32 md:w-auto bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 text-blue-500 mb-2">
                            <TrendingUp className="h-4 w-4 md:h-5 md:w-5" /> <span className="text-xs md:text-sm font-bold uppercase">Health</span>
                        </div>
                        <span className="text-2xl md:text-4xl font-black">{analytics.currentHealth}%</span>
                     </div>
                     <div className="shrink-0 w-32 md:w-auto bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 text-yellow-500 mb-2">
                            <Trophy className="h-4 w-4 md:h-5 md:w-5" /> <span className="text-xs md:text-sm font-bold uppercase">Done</span>
                        </div>
                        <span className="text-2xl md:text-4xl font-black">{analytics.activeAttemptsCount}</span>
                     </div>
                </div>

                {/* 3. Health Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
                    <h3 className="text-sm font-semibold mb-4 text-slate-500 uppercase tracking-wider">Performance Trend</h3>
                    <div className="h-[200px] md:h-[300px] w-full -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.healthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} hide />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="health" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Tabbed Insights (Restored By Unit / By Category) */}
                <Tabs defaultValue="unit" className="w-full">
                    {/* Responsive Tabs List: Horizontal scroll on mobile */}
                    <div className="w-full overflow-hidden">
                        <TabsList className="w-full max-w-full overflow-x-auto flex justify-start md:grid md:grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <TabsTrigger value="unit" className="flex-shrink-0 flex items-center gap-2 rounded-lg text-xs md:text-sm font-semibold px-4">
                                <Layers className="h-4 w-4" /> By Unit
                            </TabsTrigger>
                            <TabsTrigger value="category" className="flex-shrink-0 flex items-center gap-2 rounded-lg text-xs md:text-sm font-semibold px-4">
                                <Tag className="h-4 w-4" /> By Category
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="unit" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                        <InsightGrid data={analytics.unitMetrics} />
                    </TabsContent>

                    <TabsContent value="category" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                        <InsightGrid data={analytics.catMetrics} />
                    </TabsContent>
                </Tabs>

                 <div className="pt-4">
                     <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                     <StudentAttemptHistory student={userProfile} />
                 </div>
            </div>
        </div>
    );
}