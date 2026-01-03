'use client';

import type { User, Class, Subject, Worksheet, WorksheetAttempt, Question } from "@/types";
import { 
    BookOpen, Target, Loader2, GraduationCap, Sparkles, 
    BookMarked, Trophy, ArrowRight, Zap, Home, User as UserIcon 
} from "lucide-react";
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
                <div className={cn("text-3xl lg:text-4xl font-extrabold tracking-tight mb-1", textColor)}>
                    {value}
                </div>
                <p className={cn("text-sm font-medium opacity-70", textColor)}>{description}</p>
            </CardContent>
        </Card>
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

    // --- DATA FETCHING ---
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

    const classesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    const subjectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);
    
    const isAcademicsLoading = areClassesLoading || areSubjectsLoading;

    if (!user) return null;
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            
            {/* 📱 MOBILE HEADER (Android Style) */}
            <header className="lg:hidden sticky top-0 z-50 w-full bg-[#1e1b4b] text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500 p-1.5 rounded-lg shadow-inner">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-extrabold tracking-tight text-lg">Nalanda</span>
                </div>
                <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <div className="h-8 w-8 rounded-full bg-indigo-800 border-2 border-indigo-400/50 flex items-center justify-center text-[10px] font-bold">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 pb-24 lg:pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="py-6 lg:py-10 space-y-8 lg:space-y-12 animate-in fade-in duration-500">
                    
                    {/* HERO WELCOME BANNER */}
                    <div className="relative rounded-2xl lg:rounded-3xl bg-[#1e1b4b] text-white px-6 py-10 lg:px-12 lg:py-16 overflow-hidden shadow-2xl">
                         <div className="hidden lg:block absolute top-0 right-0 p-12 opacity-10 transform rotate-12 scale-150 pointer-events-none">
                             <Sparkles className="h-96 w-96 text-indigo-400" />
                         </div>
                         <div className="relative z-10 space-y-6 text-center lg:text-left">
                             <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-white/10 text-indigo-100 mx-auto lg:mx-0">
                                 <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                                 Student Portal Active
                             </div>
                             
                             <div className="space-y-2">
                                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                                    Welcome back, <br className="hidden lg:block" />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-100">
                                        {user.name.split(' ')[0]}
                                    </span>!
                                </h1>
                                <p className="text-sm lg:text-xl text-indigo-200/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                    Your learning journey continues. Ready to tackle some new problems?
                                </p>
                             </div>

                             <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                                <Button className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold px-8 h-12 rounded-full shadow-lg transition-all w-full sm:w-auto" asChild>
                                    <Link href="/courses">
                                        Go to Courses <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button variant="outline" className="bg-indigo-950/50 border-indigo-400/30 text-indigo-100 hover:bg-indigo-900/50 hover:text-white font-semibold px-8 h-12 rounded-full backdrop-blur-sm w-full sm:w-auto" asChild>
                                    <Link href="/progress">View Progress</Link>
                                </Button>
                             </div>
                         </div>
                    </div>

                    {/* STATS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
                        <div className="md:col-span-2 lg:col-span-3 h-full min-h-[200px]">
                            <ActivityChart />
                        </div>
                    </div>
                    
                    {/* ACADEMICS SECTION */}
                    <div className="space-y-6">
                        <Tabs defaultValue="classes" className="w-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <BookMarked className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> 
                                        Explore Academics
                                    </h2>
                                    <p className="text-muted-foreground">Access your classes and subjects.</p>
                                </div>
                                
                                <TabsList className="grid w-full sm:w-[320px] grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full h-12">
                                    <TabsTrigger value="classes" className="rounded-full h-10 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600">My Classes</TabsTrigger>
                                    <TabsTrigger value="subjects" className="rounded-full h-10 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600">All Subjects</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="classes" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {isAcademicsLoading ? (
                                    <div className="flex justify-center items-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {classes?.map((c) => <ClassCard key={c.id} classItem={c} isStudentView={true} />)}
                                    </div>
                                )}
                            </TabsContent>
                            
                            <TabsContent value="subjects" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {isAcademicsLoading ? (
                                    <div className="flex justify-center items-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {subjects?.map((s) => (
                                            <SubjectCard key={s.id} subject={s} classId={s.classId} isStudentView={true} />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* 📱 MOBILE BOTTOM NAVIGATION (Android Style) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 text-indigo-600">
                        <Home className="h-6 w-6" />
                        <span className="text-[10px] font-bold">Home</span>
                    </Link>
                    <Link href="/courses" className="flex flex-col items-center gap-1 text-slate-400">
                        <BookOpen className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Solve</span>
                    </Link>
                    <Link href="/progress" className="flex flex-col items-center gap-1 text-slate-400">
                        <Target className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Stats</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400">
                        <UserIcon className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}