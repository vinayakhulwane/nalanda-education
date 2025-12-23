'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, query, where } from "firebase/firestore";
import { Edit, Loader2, MoreVertical, PlusCircle, Trash, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Subject, Class } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SubjectsPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const firestore = useFirestore();

    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
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
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
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

    const handleEditSubject = () => {
        if (!firestore || !currentSubject || !newSubjectName) return;
        const subjectDocRef = doc(firestore, 'subjects', currentSubject.id);
        updateDocumentNonBlocking(subjectDocRef, {
            name: newSubjectName,
            description: newSubjectDescription
        });
        setEditDialogOpen(false);
        setCurrentSubject(null);
    }

    const handleDeleteSubject = () => {
        if (!firestore || !currentSubject) return;
        const subjectDocRef = doc(firestore, 'subjects', currentSubject.id);
        deleteDocumentNonBlocking(subjectDocRef);
        setDeleteDialogOpen(false);
        setCurrentSubject(null);
    };

    const openEditDialog = (subjectItem: Subject) => {
        setCurrentSubject(subjectItem);
        setNewSubjectName(subjectItem.name);
        setNewSubjectDescription(subjectItem.description);
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (subjectItem: Subject) => {
        setCurrentSubject(subjectItem);
        setDeleteDialogOpen(true);
    };

    if (isUserProfileLoading || isClassLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes
            </Button>
            <div className="flex justify-between items-center">
                <PageHeader
                    title={`Subjects for ${currentClass?.name || 'Class'}`}
                    description="Manage subjects like Mathematics or Science for this class."
                />
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
            </div>
            {areSubjectsLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {subjects?.map((s) => (
                        <Card key={s.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-headline">{s.name}</CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditDialog(s)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteDialog(s)} className="text-red-600">
                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{s.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" className="w-full">Manage Syllabus</Button>
                            </CardFooter>
                        </Card>
                    ))}
                     {subjects?.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No subjects found for this class. Click "Add Subject" to create one.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input id="edit-name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="edit-description" className="text-right">Description</Label>
                             <Textarea id="edit-description" value={newSubjectDescription} onChange={(e) => setNewSubjectDescription(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEditSubject}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting subject '{currentSubject?.name}' will permanently remove all associated units and categories. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
