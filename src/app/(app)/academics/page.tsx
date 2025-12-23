'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { Edit, Loader2, MoreVertical, PlusCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Class } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

function ClassCard({ classItem, onEdit, onDelete }: { classItem: Class, onEdit: (c: Class) => void, onDelete: (c: Class) => void }) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const description = classItem.description || "";
    const shouldTruncate = description.length > 100;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 100)}...` : description;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline">{classItem.name}</CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(classItem)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(classItem)} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    {displayedDescription}
                    {shouldTruncate && (
                         <Button variant="link" className="p-0 pl-1 text-sm h-auto" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                            {isDescriptionExpanded ? 'Read less' : 'Read more'}
                        </Button>
                    )}
                </p>
            </CardContent>
            <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => router.push(`/academics/${classItem.id}`)}>Manage Subjects</Button>
            </CardFooter>
        </Card>
    );
}


export default function AcademicsPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState<Class | null>(null);
    const [newClassName, setNewClassName] = useState('');
    const [newClassDescription, setNewClassDescription] = useState('');

    const classesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'classes');
    }, [firestore]);

    const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesCollectionRef);

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    const handleAddClass = () => {
        if (!firestore || !newClassName) return;
        addDocumentNonBlocking(collection(firestore, 'classes'), {
            name: newClassName,
            description: newClassDescription
        });
        setNewClassName('');
        setNewClassDescription('');
        setAddDialogOpen(false);
    };

    const handleEditClass = () => {
        if (!firestore || !currentClass || !newClassName) return;
        const classDocRef = doc(firestore, 'classes', currentClass.id);
        updateDocumentNonBlocking(classDocRef, {
            name: newClassName,
            description: newClassDescription
        });
        setEditDialogOpen(false);
        setCurrentClass(null);
    }

    const handleDeleteClass = () => {
        if (!firestore || !currentClass) return;
        const classDocRef = doc(firestore, 'classes', currentClass.id);
        deleteDocumentNonBlocking(classDocRef);
        setDeleteDialogOpen(false);
        setCurrentClass(null);
    };

    const openEditDialog = (classItem: Class) => {
        setCurrentClass(classItem);
        setNewClassName(classItem.name);
        setNewClassDescription(classItem.description);
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (classItem: Class) => {
        setCurrentClass(classItem);
        setDeleteDialogOpen(true);
    };


    if (isUserProfileLoading || userProfile?.role !== 'admin') {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Academics Management"
                    description="Manage academic structure from classes to categories."
                />
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2" />
                            Add Class
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add a New Class</DialogTitle>
                            <DialogDescription>
                                Create a new class level, like "Class 10" or "Grade 9".
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="col-span-3" placeholder="e.g., Class 10" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Textarea id="description" value={newClassDescription} onChange={(e) => setNewClassDescription(e.target.value)} className="col-span-3" placeholder="e.g., Secondary school, final year." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddClass}>Create Class</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {areClassesLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classes?.map((c) => (
                        <ClassCard 
                            key={c.id} 
                            classItem={c} 
                            onEdit={openEditDialog}
                            onDelete={openDeleteDialog}
                        />
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Class</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input id="edit-name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="edit-description" className="text-right">Description</Label>
                             <Textarea id="edit-description" value={newClassDescription} onChange={(e) => setNewClassDescription(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEditClass}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting class '{currentClass?.name}' will permanently remove all associated subjects, units, and categories. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
