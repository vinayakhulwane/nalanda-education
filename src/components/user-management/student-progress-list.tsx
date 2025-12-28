'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { User, Subject, Class, WorksheetAttempt, Worksheet, Question } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Users, Filter, Wallet, BarChart2, Target, TrendingUp, Gem, Coins, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useRouter } from 'next/navigation'; // Import useRouter

type SubjectEnrollmentInfo = {
    subject: Subject;
    className: string;
    enrolledStudents: User[];
};

type StudentProgressDetails = {
    student: User;
    wallet: { coins: number; gold: number; diamonds: number; };
    totalAttempts: number;
    avgScore: number;
};

// Re-using the robust score calculation logic
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
                // AI Graded Question
                if (question.gradingMode === 'ai') {
                    const firstSubId = question.solutionSteps?.[0]?.subQuestions?.[0]?.id;
                    if (firstSubId) {
                        const res = results[firstSubId];
                        // Handle both old format (score is percentage) and new format (score is marks)
                        if (res?.score) {
                            const scoreValue = Number(res.score);
                             if (scoreValue > qMax && qMax > 0) { // Likely a percentage
                                qEarned = (scoreValue / 100) * qMax;
                            } else {
                                qEarned = scoreValue;
                            }
                        }
                    }
                } else {
                    // System Graded Question
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


export function StudentProgressList() {
    const firestore = useFirestore();
    const router = useRouter();
    const [selectedSubject, setSelectedSubject] = useState<SubjectEnrollmentInfo | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [classFilter, setClassFilter] = useState<string>('all');

    // --- DATA FETCHING (Now includes all necessary collections) ---
    const subjectsRef = useMemoFirebase(() => firestore && collection(firestore, 'subjects'), [firestore]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsRef);

    const classesRef = useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesRef);

    const usersRef = useMemoFirebase(() => firestore && collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersRef);

    const attemptsRef = useMemoFirebase(() => firestore && collection(firestore, 'worksheet_attempts'), [firestore]);
    const { data: allAttempts, isLoading: attemptsLoading } = useCollection<WorksheetAttempt>(attemptsRef);

    const worksheetsRef = useMemoFirebase(() => firestore && collection(firestore, 'worksheets'), [firestore]);
    const { data: allWorksheets, isLoading: worksheetsLoading } = useCollection<Worksheet>(worksheetsRef);
    
    const questionsRef = useMemoFirebase(() => firestore && collection(firestore, 'questions'), [firestore]);
    const { data: allQuestions, isLoading: questionsLoading } = useCollection<Question>(questionsRef);

    const isLoading = subjectsLoading || classesLoading || usersLoading || attemptsLoading || worksheetsLoading || questionsLoading;

    // --- DATA PROCESSING (All calculations are now based on live data) ---
    const studentProgressDetails = useMemo((): StudentProgressDetails[] => {
        if (!selectedSubject || !allAttempts || !allWorksheets || !allQuestions) return [];

        const worksheetMap = new Map(allWorksheets.map(w => [w.id, w]));
        const questionMap = new Map(allQuestions.map(q => [q.id, q]));

        return selectedSubject.enrolledStudents.map(student => {
            const studentAttempts = allAttempts.filter(a => a.userId === student.id);
            
            let totalScore = 0;
            let totalPossible = 0;

            studentAttempts.forEach(attempt => {
                const worksheet = worksheetMap.get(attempt.worksheetId);
                const { score, total } = getAttemptTotals(attempt, worksheet, questionMap);
                totalScore += score;
                totalPossible += total;
            });

            const avgScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
            
            return {
                student,
                wallet: { coins: student.coins, gold: student.gold, diamonds: student.diamonds },
                totalAttempts: studentAttempts.length,
                avgScore: Math.round(avgScore),
            };
        });
    }, [selectedSubject, allAttempts, allWorksheets, allQuestions]);


    const enrollmentData = useMemo((): SubjectEnrollmentInfo[] => {
        if (!subjects || !classes || !users) return [];
        const classMap = new Map(classes.map(c => [c.id, c.name]));
        return subjects.map(subject => {
            const enrolledStudents = users.filter(user => user.enrollments?.includes(subject.id));
            return { subject, className: classMap.get(subject.classId) || 'Unknown Class', enrolledStudents };
        });
    }, [subjects, classes, users]);

    const filteredEnrollmentData = useMemo(() => {
        if (classFilter === 'all') return enrollmentData;
        return enrollmentData.filter(data => data.subject.classId === classFilter);
    }, [enrollmentData, classFilter]);


    const handleViewStudents = (data: SubjectEnrollmentInfo) => {
        setSelectedSubject(data);
        setDialogOpen(true);
    };
    
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Student Progress Overview</CardTitle>
                <CardDescription>Track student performance metrics across different subjects.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject Name</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <Select value={classFilter} onValueChange={setClassFilter}>
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue placeholder="Filter by class..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Classes</SelectItem>
                                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TableHead>
                                <TableHead className="text-center">Enrolled Students</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEnrollmentData.map(data => (
                                <TableRow key={data.subject.id}>
                                    <TableCell className="font-medium">{data.subject.name}</TableCell>
                                    <TableCell>{data.className}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="link" onClick={() => handleViewStudents(data)} disabled={data.enrolledStudents.length === 0} className="flex items-center justify-center gap-2 mx-auto">
                                            <Users className="h-4 w-4" />
                                            {data.enrolledStudents.length}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEnrollmentData.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No subjects found for this filter.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[850px]">
                    <DialogHeader>
                        <DialogTitle>Student Progress in {selectedSubject?.subject.name}</DialogTitle>
                        <DialogDescription>Overview of student performance in this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? (
                             <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : studentProgressDetails.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead className="text-center">Wallet</TableHead>
                                            <TableHead className="text-center">Total Attempts</TableHead>
                                            <TableHead className="text-center">Avg. Score</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentProgressDetails.map(detail => (
                                            <TableRow key={detail.student.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={detail.student.avatar} alt={detail.student.name} />
                                                            <AvatarFallback>{getInitials(detail.student.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-sm">{detail.student.name}</p>
                                                            <p className="text-xs text-muted-foreground">{detail.student.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                     <div className="flex justify-center items-center gap-3">
                                                        <span className="flex items-center gap-1 text-yellow-600"><Coins className="h-3 w-3" />{detail.wallet.coins}</span>
                                                        <span className="flex items-center gap-1 text-amber-600"><Crown className="h-3 w-3" />{detail.wallet.gold}</span>
                                                        <span className="flex items-center gap-1 text-blue-600"><Gem className="h-3 w-3" />{detail.wallet.diamonds}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                                        {detail.totalAttempts}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Target className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{detail.avgScore}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" onClick={() => router.push(`/user-management/${detail.student.id}/progress`)}>
                                                        <TrendingUp className="mr-2 h-4 w-4" />
                                                        Full Report
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                        ) : (
                            <p className="text-center text-muted-foreground">No students are currently enrolled in this subject.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
