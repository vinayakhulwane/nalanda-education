'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, query, where } from "firebase/firestore";
import { ArrowLeft, Loader2, PlusCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Subject, Class } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { SubjectCard } from "@/components/subject-card";

export default function SubjectsPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const firestore = useFirestore();

    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectDescription, setNewSubjectDescription] = useState('');

    const classDocRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return doc(firestore, 'classes', classId);
    }, [firestore, classId]);

    const { data: currentClass, isLoading: isClassLoading } = useDoc<Class>(classDocRef);
    
    const subjectsQueryRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return query(collection(firestore, 'subjects'), where('classId', '==', classId));
    }, [firestore, classId]);

    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQueryRef);

    useEffect(() => {
        if (!isUserProfileLoading && userProfile && userProfile.role === 'student') {
            // Students are allowed to view this page, so we do nothing.
            return;
        }
        if (!isUserProfileLoading && userProfile?.role !== 'admin' && userProfile?.role !== 'teacher') {
            // Redirect non-admins/teachers who aren't students
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    const handleAddSubject = () => {
        if (!firestore || !newSubjectName || !classId) return;
        addDocumentNonBlocking(collection(firestore, 'subjects'), {
            name: newSubjectName,
            description: newSubjectDescription,
            classId: classId
        });
        setNewSubjectName('');
        setNewSubjectDescription('');
        setAddDialogOpen(false);
    };

    if (isUserProfileLoading || isClassLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push('/academics')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes
            </Button>
            <div className="flex justify-between items-center">
                <PageHeader
                    title={`Subjects for ${currentClass?.name || 'Class'}`}
                    description={userIsEditor ? "Manage subjects like Mathematics or Science for this class." : "Browse subjects available in this class."}
                />
                {userIsEditor && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2" />
                                Add Subject
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add a New Subject</DialogTitle>
                                <DialogDescription>
                                    Create a new subject for {currentClass?.name}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="col-span-3" placeholder="e.g., Mathematics" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">Description</Label>
                                    <Textarea id="description" value={newSubjectDescription} onChange={(e) => setNewSubjectDescription(e.target.value)} className="col-span-3" placeholder="e.g., Study of numbers, quantity, and space." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddSubject}>Create Subject</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            {areSubjectsLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {subjects?.map((s) => (
                        <SubjectCard 
                            key={s.id} 
                            subject={s} 
                            classId={classId}
                            isStudentView={!userIsEditor}
                        />
                    ))}
                     {subjects?.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No subjects found for this class. {userIsEditor && 'Click "Add Subject" to create one.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
