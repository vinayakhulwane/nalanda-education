'use client';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, query, where } from "firebase/firestore";
import { Edit, Loader2, PlusCircle, Trash, ArrowLeft, MoreVertical, GripVertical } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Subject, Class, Unit, Category } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function SyllabusPage() {
    const { userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const subjectId = params.subjectId as string;
    const firestore = useFirestore();

    // Dialog states
    const [dialogType, setDialogType] = useState<'addUnit' | 'editUnit' | 'deleteUnit' | 'addCategory' | 'editCategory' | 'deleteCategory' | null>(null);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    
    // Data fetching
    const subjectDocRef = useMemoFirebase(() => firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null, [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

    const unitsQuery = useMemoFirebase(() => firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null, [firestore, subjectId]);
    const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQuery);

    const categoriesQuery = useMemoFirebase(() => firestore && units ? query(collection(firestore, 'categories'), where('unitId', 'in', units.map(u => u.id))) : null, [firestore, units]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);

    useEffect(() => {
        if (!isUserProfileLoading && userProfile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    // Handlers
    const closeDialog = () => {
        setDialogType(null);
        setCurrentUnit(null);
        setCurrentCategory(null);
        setNewName('');
        setNewDescription('');
    }

    const handleSaveChanges = () => {
        if (!firestore) return;
        switch (dialogType) {
            case 'addUnit':
                addDocumentNonBlocking(collection(firestore, 'units'), { name: newName, description: newDescription, subjectId });
                break;
            case 'editUnit':
                if (currentUnit) updateDocumentNonBlocking(doc(firestore, 'units', currentUnit.id), { name: newName, description: newDescription });
                break;
            case 'deleteUnit':
                if (currentUnit) deleteDocumentNonBlocking(doc(firestore, 'units', currentUnit.id));
                break;
            case 'addCategory':
                if (currentUnit) addDocumentNonBlocking(collection(firestore, 'categories'), { name: newName, description: newDescription, unitId: currentUnit.id });
                break;
            case 'editCategory':
                if (currentCategory) updateDocumentNonBlocking(doc(firestore, 'categories', currentCategory.id), { name: newName, description: newDescription });
                break;
            case 'deleteCategory':
                if (currentCategory) deleteDocumentNonBlocking(doc(firestore, 'categories', currentCategory.id));
                break;
        }
        closeDialog();
    }
    
    const openDialog = (type: typeof dialogType, unit?: Unit, category?: Category) => {
        setDialogType(type);
        if (unit) setCurrentUnit(unit);
        if (category) {
            setCurrentCategory(category)
            setNewName(category.name);
            setNewDescription(category.description);
        } else if (unit) {
            setNewName(unit.name);
            setNewDescription(unit.description);
        }
    }


    if (isUserProfileLoading || isSubjectLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push(`/academics/${classId}`)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subjects
            </Button>
            <div className="flex justify-between items-center mb-6">
                <PageHeader
                    title={`Syllabus for ${subject?.name || 'Subject'}`}
                    description="Manage units and categories for this subject."
                    className="mb-0"
                />
                <Button onClick={() => setDialogType('addUnit')}>
                    <PlusCircle className="mr-2" />
                    Add Unit
                </Button>
            </div>

            {areUnitsLoading || areCategoriesLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ): (
                <Accordion type="multiple" className="w-full space-y-4">
                    {units?.map(unit => (
                        <AccordionItem value={unit.id} key={unit.id} className="bg-card border rounded-lg px-4">
                             <div className="flex items-center">
                                <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
                                <AccordionTrigger className="text-lg font-headline hover:no-underline">
                                    {unit.name}
                                </AccordionTrigger>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openDialog('editUnit', unit)}>Edit Unit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDialog('addCategory', unit)}>Add Category</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDialog('deleteUnit', unit)} className="text-red-500">Delete Unit</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                            <AccordionContent>
                                <p className="text-muted-foreground text-sm pb-4">{unit.description}</p>
                                <div className="space-y-2 pl-6 border-l-2 ml-3">
                                   {categories?.filter(c => c.unitId === unit.id).map(category => (
                                       <div key={category.id} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                           <div>
                                               <p className="font-medium">{category.name}</p>
                                               <p className="text-sm text-muted-foreground">{category.description}</p>
                                           </div>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('editCategory', unit, category)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('deleteCategory', unit, category)}><Trash className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                       </div>
                                   ))}
                                    {categories?.filter(c => c.unitId === unit.id).length === 0 && (
                                        <p className="text-sm text-muted-foreground py-4">No categories in this unit.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    {units?.length === 0 && (
                        <Card className="text-center py-12">
                            <CardContent>
                                <p className="text-muted-foreground">No units found. Start by adding one.</p>
                            </CardContent>
                        </Card>
                    )}
                </Accordion>
            )}

            {/* Generic Dialog for Add/Edit */}
            <Dialog open={!!(dialogType?.includes('add') || dialogType?.includes('edit'))} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogType?.includes('add') ? 'Add New' : 'Edit'} {dialogType?.includes('Unit') ? 'Unit' : 'Category'}</DialogTitle>
                         <DialogDescription>
                            {dialogType === 'addUnit' && `Create a new unit for ${subject?.name}.`}
                            {dialogType === 'editUnit' && `Editing the unit: ${currentUnit?.name}.`}
                            {dialogType === 'addCategory' && `Create a new category for the unit: ${currentUnit?.name}.`}
                            {dialogType === 'editCategory' && `Editing the category: ${currentCategory?.name}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} />
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic Delete Confirmation Dialog */}
            <AlertDialog open={!!dialogType?.includes('delete')} onOpenChange={closeDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {' '}
                            {dialogType === 'deleteUnit' ? `unit '${currentUnit?.name}' and all its categories.` : `category '${currentCategory?.name}'.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
