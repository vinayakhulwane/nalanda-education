'use client';
import type { User, Course, Class, Subject, Worksheet, WorksheetAttempt, Question } from "@/types";
import { BookOpen, Target, CheckCircle2, Loader2, GraduationCap, Sparkles, BookMarked, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import { ClassCard } from "./academics/class-card";
import { SubjectCard } from "./subject-card";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ActivityChart } from "./dashboard/activity-chart";

type StudentDashboardProps = {
    user: User | null;
}

// --- HELPER COMPONENT: Modern Stat Card ---
function DashboardStatCard({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    gradient 
}: { 
    title: string, 
    value: string, 
    icon: any, 
    description: string, 
    gradient: string 
}) {
    return (
        <Card className={cn("border-none shadow-md overflow-hidden relative group transition-all hover:shadow-lg", gradient)}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Icon className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <div className="p-1.5 rounded-md bg-background/50 backdrop-blur-sm border shadow-sm">
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
                </div>
                <CardTitle className="text-4xl font-extrabold tracking-tight">
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
                <p className="text-sm text-muted-foreground font-medium">{description}</p>
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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BookMarked className="h-6 w-6 text-primary" /> 
                    Explore Academics
                </h2>
            </div>

            <Tabs defaultValue="classes" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <TabsTrigger 
                        value="classes"
                        className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                    >
                        My Classes
                    </TabsTrigger>
                    <TabsTrigger 
                        value="subjects"
                        className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                    >
                        All Subjects
                    </TabsTrigger>
                </TabsList>
                
                <div className="mt-6 min-h-[300px]">
                    <TabsContent value="classes" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {classes?.map((c) => (
                                    <div key={c.id} className="transform transition-all hover:-translate-y-1 hover:shadow-md rounded-xl">
                                        <ClassCard classItem={c} isStudentView={true} />
                                    </div>
                                ))}
                                {classes?.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold">No Classes Found</h3>
                                        <p className="text-muted-foreground">You haven't been enrolled in any classes yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="subjects" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {subjects?.map((s) => (
                                    <div key={s.id} className="transform transition-all hover:-translate-y-1 hover:shadow-md rounded-xl">
                                        <SubjectCard 
                                            subject={s} 
                                            classId={s.classId} 
                                            isStudentView={true}
                                        />
                                    </div>
                                ))}
                                {subjects?.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold">No Subjects Found</h3>
                                        <p className="text-muted-foreground">There are no subjects available to display.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}

// Logic Helper (Unchanged)
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


    if (!user) {
        return null;
    }
    
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            {/* HERO SECTION */}
            <div className="relative rounded-3xl bg-slate-900 text-white p-8 md:p-12 overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-8 opacity-20">
                     <Sparkles className="h-64 w-64 text-yellow-400" />
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
                 
                 <div className="relative z-10 space-y-4">
                     <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                         <GraduationCap className="h-4 w-4 text-yellow-400" />
                         <span>Student Portal</span>
                     </div>
                     <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                         Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-200">{user.name.split(' ')[0]}</span>!
                     </h1>
                     <p className="text-lg text-slate-300 max-w-2xl">
                         Ready to continue your learning journey? Check your stats below and dive into your coursework.
                     </p>
                 </div>
            </div>

            {/* STATS GRID */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <DashboardStatCard
                    title="Active Courses"
                    value={user.enrollments?.length.toString() ?? '0'}
                    icon={BookOpen}
                    description="Courses enrolled"
                    gradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/30"
                />
                <DashboardStatCard
                    title="Average Score"
                    value={attemptsLoading || worksheetsLoading || questionsLoading ? '...' : overallScore}
                    icon={Target}
                    description="Across all attempts"
                    gradient="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/30"
                />
                <DashboardStatCard
                    title="Completed Works"
                    value={attemptsLoading ? '...' : (completedWorksheets ?? user.completedWorksheets?.length ?? 0).toString()}
                    icon={Trophy}
                    description="Worksheets finished"
                    gradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/30"
                />
                <div className="lg:col-span-1">
                    <ActivityChart />
                </div>
            </div>
            
            {/* ACADEMICS SECTION */}
            <StudentAcademics />
        </div>
    )
}
