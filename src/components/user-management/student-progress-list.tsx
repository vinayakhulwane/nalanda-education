'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { User, Subject, Class } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Users, Filter, Wallet, BarChart2, Target, TrendingUp, Gem, Diamond, Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';

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

export function StudentProgressList() {
    const firestore = useFirestore();
    const [selectedSubject, setSelectedSubject] = useState<SubjectEnrollmentInfo | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [classFilter, setClassFilter] = useState<string>('all');

    const subjectsRef = useMemoFirebase(() => firestore && collection(firestore, 'subjects'), [firestore]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsRef);

    const classesRef = useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesRef);

    const usersRef = useMemoFirebase(() => firestore && collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersRef);

    const isLoading = subjectsLoading || classesLoading || usersLoading;

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

    // Mock student progress data for the dialog
    const studentProgressDetails = useMemo((): StudentProgressDetails[] => {
        if (!selectedSubject) return [];
        return selectedSubject.enrolledStudents.map(student => ({
            student,
            wallet: { coins: student.coins, gold: student.gold, diamonds: student.diamonds },
            totalAttempts: Math.floor(Math.random() * 50) + 5, // Mock data
            avgScore: Math.floor(Math.random() * 30) + 70, // Mock data (70-100)
        }));
    }, [selectedSubject]);

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
                        {studentProgressDetails.length > 0 ? (
                            <TooltipProvider>
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
                                                <TableCell className="text-center">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Wallet className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="flex flex-col gap-2 p-1 text-xs">
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-yellow-500" /> Coins:</span>
                                                                    <span>{detail.wallet.coins}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <span className="flex items-center gap-1"><Gem className="h-3 w-3 text-red-500" /> Gold:</span>
                                                                    <span>{detail.wallet.gold}</span>
                                                                </div>
                                                                 <div className="flex justify-between items-center gap-4">
                                                                    <span className="flex items-center gap-1"><Diamond className="h-3 w-3 text-blue-500" /> Diamonds:</span>
                                                                    <span>{detail.wallet.diamonds}</span>
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
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
                                                    <Button variant="outline" size="sm" disabled>
                                                        <TrendingUp className="mr-2 h-4 w-4" />
                                                        Progress
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TooltipProvider>
                        ) : (
                            <p className="text-center text-muted-foreground">No students are currently enrolled in this subject.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
