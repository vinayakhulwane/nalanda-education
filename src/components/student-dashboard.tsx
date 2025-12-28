'use client';
import type { User, Course, Class, Subject, Worksheet, WorksheetAttempt, Question } from "@/types";
import { PageHeader } from "./page-header";
import { StatsCard } from "./stats-card";
import { BookOpen, Target, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import { ClassCard } from "./academics/class-card";
import { SubjectCard } from "./subject-card";
import { useMemo } from "react";

type StudentDashboardProps = {
    user: User | null;
}

function StudentAcademics() {
    const firestore = useFirestore();

    const classesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    const subjectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);

    const isLoading = areClassesLoading || areSubjectsLoading;

    return (
        <Tabs defaultValue="classes" className="mt-6">
            <TabsList>
                <TabsTrigger value="classes">All Classes</TabsTrigger>
                <TabsTrigger value="subjects">All Subjects</TabsTrigger>
            </TabsList>
            <TabsContent value="classes">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                        {classes?.map((c) => (
                            <ClassCard
                                key={c.id}
                                classItem={c}
                                isStudentView={true}
                            />
                        ))}
                         {classes?.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                No classes available yet.
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
            <TabsContent value="subjects">
                 {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                        {subjects?.map((s) => (
                            <SubjectCard 
                                key={s.id} 
                                subject={s} 
                                classId={s.classId} 
                                isStudentView={true}
                            />
                        ))}
                        {subjects?.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                No subjects available yet.
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}

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
        return null; // or a loading state
    }
    
    return (
        <div>
            <PageHeader
                title={`Welcome back, ${user.name.split(' ')[0]}!`}
                description="Here's a summary of your academic journey."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatsCard
                    title="Courses Enrolled"
                    value={user.enrollments?.length.toString() ?? '0'}
                    icon={BookOpen}
                    description="The number of courses you are currently taking."
                />
                <StatsCard
                    title="Overall Score"
                    value={attemptsLoading || worksheetsLoading || questionsLoading ? '...' : overallScore}
                    icon={Target}
                    description="Your average score across all attempts."
                />
                <StatsCard
                    title="Worksheets Completed"
                    value={attemptsLoading ? '...' : (completedWorksheets ?? user.completedWorksheets?.length ?? 0).toString()}
                    icon={CheckCircle}
                    description="Keep up the great work!"
                />
            </div>
            
            <h2 className="font-headline text-2xl font-bold tracking-tight">Explore Academics</h2>
            <StudentAcademics />
        </div>
    )
}
