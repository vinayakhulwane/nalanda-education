'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { arrayRemove, collection, doc, updateDoc } from "firebase/firestore";
import type { User, Subject, Class } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UserX, Users, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

type SubjectEnrollmentInfo = {
    subject: Subject;
    className: string;
    enrolledStudents: User[];
};

export function EnrollmentList() {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const [selectedSubject, setSelectedSubject] = useState<SubjectEnrollmentInfo | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [classFilter, setClassFilter] = useState<string>('all');


    // Fetch all necessary data
    const subjectsRef = useMemoFirebase(() => firestore && collection(firestore, 'subjects'), [firestore]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsRef);

    const classesRef = useMemoFirebase(() => firestore && collection(firestore, 'classes'), [firestore]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesRef);

    const usersRef = useMemoFirebase(() => firestore && collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersRef);

    const isLoading = subjectsLoading || classesLoading || usersLoading;

    // Memoize the processed data
    const enrollmentData = useMemo((): SubjectEnrollmentInfo[] => {
        if (!subjects || !classes || !users) return [];

        const classMap = new Map(classes.map(c => [c.id, c.name]));
        
        return subjects.map(subject => {
            const enrolledStudents = users.filter(user => user.enrollments?.includes(subject.id));
            return {
                subject,
                className: classMap.get(subject.classId) || 'Unknown Class',
                enrolledStudents,
            };
        });
    }, [subjects, classes, users]);

    const filteredEnrollmentData = useMemo(() => {
        if (classFilter === 'all') {
            return enrollmentData;
        }
        return enrollmentData.filter(data => data.subject.classId === classFilter);
    }, [enrollmentData, classFilter]);


    const handleViewStudents = (data: SubjectEnrollmentInfo) => {
        setSelectedSubject(data);
        setDialogOpen(true);
    };

    const handleStatusToggle = (userId: string, currentStatus: boolean) => {
        if (userId === currentUser?.uid) {
            alert("You cannot block yourself.");
            return;
        }
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        updateDoc(userDocRef, { active: !currentStatus });
    };

    const handleUnenrollUser = async (userId: string, subjectId: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, {
            enrollments: arrayRemove(subjectId)
        });
        // Close dialog if last student is removed
        if (selectedSubject?.enrolledStudents.length === 1) {
            setDialogOpen(false);
        }
    };
    
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Subject Enrollments</CardTitle>
                <CardDescription>View and manage student enrollments across all subjects.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
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
                                                {classes?.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
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
                                        <Button 
                                            variant="link" 
                                            onClick={() => handleViewStudents(data)}
                                            disabled={data.enrolledStudents.length === 0}
                                            className="flex items-center justify-center gap-2 mx-auto"
                                        >
                                            <Users className="h-4 w-4" />
                                            {data.enrolledStudents.length}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {filteredEnrollmentData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        {classFilter === 'all' ? 'No subjects found.' : 'No subjects found for this class.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>Enrolled Students in {selectedSubject?.subject.name}</DialogTitle>
                        <DialogDescription>
                           Manage students enrolled in this subject.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {selectedSubject && selectedSubject.enrolledStudents.length > 0 ? (
                             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {selectedSubject.enrolledStudents.map(student => (
                                    <div key={student.id} className="flex items-center space-x-4 p-2 rounded-md hover:bg-muted">
                                        <Avatar>
                                            <AvatarImage src={student.avatar} alt={student.name} />
                                            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Label htmlFor={`block-switch-${student.id}`} className="text-xs text-muted-foreground">
                                                {student.active ?? true ? 'Active' : 'Blocked'}
                                            </Label>
                                            <Switch
                                                id={`block-switch-${student.id}`}
                                                checked={student.active ?? true}
                                                onCheckedChange={() => handleStatusToggle(student.id, student.active ?? true)}
                                                disabled={student.id === currentUser?.uid}
                                                aria-label="Activate or block user"
                                            />
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleUnenrollUser(student.id, selectedSubject.subject.id)}
                                            className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <UserX className="mr-2 h-4 w-4" /> Unenroll
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">No students are currently enrolled in this subject.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
