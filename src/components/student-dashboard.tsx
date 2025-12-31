'use client';
import type { User, Class, Subject, Worksheet, WorksheetAttempt, Question } from "@/types";
import { BookOpen, Target, Loader2, GraduationCap, Sparkles, BookMarked, Trophy, ArrowRight, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import { ClassCard } from "./academics/class-card";
import { SubjectCard } from "./subject-card";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ActivityChart } from "./dashboard/activity-chart";
import Link from "next/link";

type StudentDashboardProps = {
    user: User | null;
}

// --- HELPER COMPONENT: Modern Stat Card ---
function DashboardStatCard({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    gradient,
    textColor 
}: { 
    title: string, 
    value: string, 
    icon: any, 
    description: string, 
    gradient: string,
    textColor: string
}) {
    return (
        <Card className={cn("border-none shadow-sm overflow-hidden relative group transition-all hover:shadow-md hover:-translate-y-1 h-full", gradient)}>
            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500", textColor)}>
                <Icon className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className={cn("p-1.5 rounded-md bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-sm", textColor)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn("text-xs font-bold uppercase tracking-wider opacity-80", textColor)}>{title}</span>
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className={cn("text-4xl font-extrabold tracking-tight mb-1", textColor)}>
                    {value}
                </div>
                <p className={cn("text-sm font-medium opacity-70", textColor)}>{description}</p>
            </CardContent>
        </Card>
    );
}

function StudentAcademics() {
    const firestore = useFirestore();

    const classesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    const subjectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);

    const isLoading = areClassesLoading || areSubjectsLoading;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <BookMarked className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> 
                        Explore Academics
                    </h2>
                    <p className="text-muted-foreground">Access your enrolled classes and browse all available subjects.</p>
                </div>
                
                <Tabs defaultValue="classes" className="w-full sm:w-auto">
                    <TabsList className="grid w-full sm:w-[300px] grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <TabsTrigger 
                            value="classes"
                            className="rounded-full px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-medium"
                        >
                            My Classes
                        </TabsTrigger>
                        <TabsTrigger 
                            value="subjects"
                            className="rounded-full px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-medium"
                        >
                            All Subjects
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* CONTENT AREA - Now controlled by the Tabs above but content renders below */}
            <div className="min-h-[300px]">
                {/* We need to wrap the triggers and content in the same Tabs context. 
                    Since the triggers are above, we can't easily split them in this structure without passing state.
                    However, Radix/Shadcn Tabs requires context. 
                    
                    REFACTOR: Let's move the Tabs wrapper to surround the whole section.
                */}
            </div>
        </div>
    );
}

// Helper for logic
const getAttemptTotals = (a: WorksheetAttempt, worksheet: Worksheet | undefined, allQuestions: Map<string, any>) => {
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
                if (question.gradingMode === 'ai') {
                    const firstSubId = question.solutionSteps?.[0]?.subQuestions?.[0]?.id;
                    if(firstSubId) {
                        const res = results[firstSubId];
                        if (res?.score) {
                           qEarned = (res.score / 100) * qMax;
                        }
                    }
                } else {
                    question.solutionSteps?.forEach((step: any) => {
                        step.subQuestions.forEach((sub: any) => {
                            const res = results[sub.id];
                            if (res?.isCorrect) qEarned += (sub.marks || 0);
                        });
                    });
                }
                calcScore += qEarned;
            }
        });
    }
    return { score: calcScore, total: calcTotal };
};

export function StudentDashboard({ user }: StudentDashboardProps) {
    const firestore = useFirestore();

    // Data Fetching Logic (Same as before, just kept for functionality)
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.id) return null;
        return query(collection(firestore, 'worksheet_attempts'), where('userId', '==', user.id));
    }, [firestore, user?.id]);
    const { data: attempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);
    
    const worksheetIds = useMemo(() => attempts ? [...new Set(attempts.map(a => a.worksheetId))] : [], [attempts]);

    const worksheetsQuery = useMemoFirebase(() => {
        if (!firestore || worksheetIds.length === 0) return null;
        return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0,30)));
    }, [firestore, worksheetIds]);
    const { data: worksheets, isLoading: worksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);
    
    const allQuestionIds = useMemo(() => worksheets ? [...new Set(worksheets.flatMap(w => w.questions))] : [], [worksheets]);

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || allQuestionIds.length === 0) return null;
        return query(collection(firestore, 'questions'), where(documentId(), 'in', allQuestionIds.slice(0,30)));
    }, [firestore, allQuestionIds]);
    const { data: questions, isLoading: questionsLoading } = useCollection<Question>(questionsQuery);
    
    const { overallScore, completedWorksheets } = useMemo(() => {
        if (!attempts || !worksheets || !questions) return { overallScore: 'N/A', completedWorksheets: 0 };

        const worksheetMap = new Map(worksheets.map(w => [w.id, w]));
        const questionMap = new Map(questions.map(q => [q.id, q]));

        let totalScore = 0;
        let totalPossible = 0;

        attempts.forEach(attempt => {
            const worksheet = worksheetMap.get(attempt.worksheetId);
            const { score, total } = getAttemptTotals(attempt, worksheet, questionMap);
            totalScore += score;
            totalPossible += total;
        });

        if (totalPossible === 0) return { overallScore: 'N/A', completedWorksheets: attempts.length };

        const percentage = (totalScore / totalPossible) * 100;
        return { overallScore: `${percentage.toFixed(1)}%`, completedWorksheets: attempts.length };
    }, [attempts, worksheets, questions]);

    // Academics Data Fetching (Moved up to pass to tabs)
    const classesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    const subjectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);
    
    const isAcademicsLoading = areClassesLoading || areSubjectsLoading;


    if (!user) {
        return null;
    }
    
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            
            {/* HERO WELCOME BANNER */}
            <div className="relative rounded-3xl bg-[#1e1b4b] text-white px-6 sm:px-8 md:px-12 py-8 md:py-12 overflow-hidden shadow-2xl">
                 {/* Abstract Background Shapes */}
                 <div className="absolute top-0 right-0 p-12 opacity-10 transform rotate-12 scale-150 pointer-events-none">
                     <Sparkles className="h-96 w-96 text-indigo-400" />
                 </div>
                 <div className="absolute bottom-0 left-0 p-8 opacity-5 transform -rotate-12 scale-125 pointer-events-none">
                     <GraduationCap className="h-80 w-80 text-purple-400" />
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 via-transparent to-purple-900/50" />
                 
                 <div className="relative z-10 max-w-3xl space-y-6">
                     <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold border border-white/10 shadow-sm text-indigo-100">
                         <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                         Student Portal
                     </div>
                     
                     <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                            Welcome back, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-100">
                                {user.name.split(' ')[0]}
                            </span>!
                        </h1>
                        <p className="text-lg md:text-xl text-indigo-200/90 max-w-xl leading-relaxed">
                            Your learning journey continues. Check your latest stats and jump back into your coursework.
                        </p>
                     </div>

                     <div className="flex gap-4 pt-2">
                        <Button className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold px-6 h-12 rounded-full shadow-lg hover:shadow-xl transition-all" asChild>
                            <Link href="/courses">
                                Go to Courses <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" className="bg-indigo-950/50 border-indigo-400/30 text-indigo-100 hover:bg-indigo-900/50 hover:text-white font-semibold px-6 h-12 rounded-full backdrop-blur-sm" asChild>
                            <Link href="/progress">
                                View Progress
                            </Link>
                        </Button>
                     </div>
                 </div>
            </div>

            {/* STATS GRID */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <DashboardStatCard
                    title="Active Courses"
                    value={user.enrollments?.length.toString() ?? '0'}
                    icon={BookOpen}
                    description="Currently enrolled"
                    gradient="bg-blue-50/50 dark:bg-blue-950/10"
                    textColor="text-blue-600 dark:text-blue-400"
                />
                <DashboardStatCard
                    title="Average Score"
                    value={attemptsLoading || worksheetsLoading || questionsLoading ? '...' : overallScore}
                    icon={Target}
                    description="Performance avg."
                    gradient="bg-emerald-50/50 dark:bg-emerald-950/10"
                    textColor="text-emerald-600 dark:text-emerald-400"
                />
                <DashboardStatCard
                    title="Completed Works"
                    value={attemptsLoading ? '...' : (completedWorksheets ?? user.completedWorksheets?.length ?? 0).toString()}
                    icon={Trophy}
                    description="Worksheets finished"
                    gradient="bg-amber-50/50 dark:bg-amber-950/10"
                    textColor="text-amber-600 dark:text-amber-400"
                />
                
                {/* Activity Chart Container - Spans 1 col */}
                <div className="h-full min-h-[160px]">
                    <ActivityChart />
                </div>
            </div>
            
            {/* ACADEMICS SECTION (TABS) */}
            <div className="space-y-6">
                <Tabs defaultValue="classes" className="w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                <BookMarked className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> 
                                Explore Academics
                            </h2>
                            <p className="text-muted-foreground">Access your enrolled classes and browse all available subjects.</p>
                        </div>
                        
                        <TabsList className="grid w-full sm:w-[320px] grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full h-12">
                            <TabsTrigger 
                                value="classes"
                                className="rounded-full h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all font-bold"
                            >
                                My Classes
                            </TabsTrigger>
                            <TabsTrigger 
                                value="subjects"
                                className="rounded-full h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all font-bold"
                            >
                                All Subjects
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="min-h-[300px]">
                        <TabsContent value="classes" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {isAcademicsLoading ? (
                                <div className="flex justify-center items-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        <p className="text-muted-foreground font-medium">Loading classes...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {classes?.map((c) => (
                                        <div key={c.id} className="transform transition-all hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
                                            <ClassCard classItem={c} isStudentView={true} />
                                        </div>
                                    ))}
                                    {classes?.length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                                <BookOpen className="h-10 w-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Classes Found</h3>
                                            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">You haven't been enrolled in any classes yet. Ask your administrator for access.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                        
                        <TabsContent value="subjects" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {isAcademicsLoading ? (
                                <div className="flex justify-center items-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        <p className="text-muted-foreground font-medium">Loading subjects...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {subjects?.map((s) => (
                                        <div key={s.id} className="transform transition-all hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
                                            <SubjectCard 
                                                subject={s} 
                                                classId={s.classId} 
                                                isStudentView={true}
                                            />
                                        </div>
                                    ))}
                                    {subjects?.length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                                <Zap className="h-10 w-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Subjects Found</h3>
                                            <p className="text-muted-foreground mt-2">There are no subjects available to display at this moment.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
