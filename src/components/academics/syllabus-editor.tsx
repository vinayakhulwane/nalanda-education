'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
// ✅ Switched to standard Firestore functions for better control in Modals
import { collection, doc, query, where, writeBatch, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Unit, Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableUnitItem } from "@/components/academics/sortable-unit-item";
import { useToast } from '@/hooks/use-toast'; // Assuming you have this hook

export default function SyllabusEditor({ subjectId, subjectName }: { subjectId: string, subjectName: string }) {
    const firestore = useFirestore();
    const { userProfile } = useUser();
    const { toast } = useToast();
    
    // Dialog states
    const [dialogType, setDialogType] = useState<'addUnit' | 'editUnit' | 'deleteUnit' | 'addCategory' | 'editCategory' | 'deleteCategory' | null>(null);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    
    // Form states
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false); // ✅ Added Loading State

    // Data fetching
    const unitsQuery = useMemoFirebase(() => firestore && subjectId ? query(collection(firestore, 'units'), where('subjectId', '==', subjectId)) : null, [firestore, subjectId]);
    const { data: units, isLoading: areUnitsLoading } = useCollection<Unit>(unitsQuery);

    const sortedUnits = useMemo(() => units?.sort((a, b) => a.order - b.order) || [], [units]);

    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore || !units || units.length === 0) return null;
        const unitIds = units.map(u => u.id).filter(id => !!id);
        if (unitIds.length === 0) return null;
        return query(collection(firestore, 'categories'), where('unitId', 'in', unitIds));
    }, [firestore, units]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);

    const categoriesByUnit = useMemo(() => {
        if (!categories) return {};
        return categories.reduce((acc, category) => {
            if (!acc[category.unitId]) {
                acc[category.unitId] = [];
            }
            acc[category.unitId].push(category);
            acc[category.unitId].sort((a,b) => a.order - b.order);
            return acc;
        }, {} as Record<string, Category[]>);
    }, [categories]);
    
    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    // Handlers
    const closeDialog = () => {
        setDialogType(null);
        setCurrentUnit(null);
        setCurrentCategory(null);
        setNewName('');
        setNewDescription('');
        setIsSaving(false);
    }

    // ✅ FIXED: Async handler to prevent UI freezes
    const handleSaveChanges = async () => {
        if (!firestore) return;
        
        setIsSaving(true);
        try {
            switch (dialogType) {
                case 'addUnit':
                    const newUnitOrder = units ? units.length : 0;
                    await addDoc(collection(firestore, 'units'), { 
                        name: newName, 
                        description: newDescription, 
                        subjectId, 
                        order: newUnitOrder 
                    });
                    break;
                case 'editUnit':
                    if (currentUnit) {
                        await updateDoc(doc(firestore, 'units', currentUnit.id), { 
                            name: newName, 
                            description: newDescription 
                        });
                    }
                    break;
                case 'deleteUnit':
                    if (currentUnit) {
                        await deleteDoc(doc(firestore, 'units', currentUnit.id));
                    }
                    break;
                case 'addCategory':
                    if (currentUnit) {
                        const newCategoryOrder = categoriesByUnit[currentUnit.id]?.length || 0;
                        await addDoc(collection(firestore, 'categories'), { 
                            name: newName, 
                            description: newDescription, 
                            unitId: currentUnit.id, 
                            order: newCategoryOrder 
                        });
                    }
                    break;
                case 'editCategory':
                    if (currentCategory) {
                        await updateDoc(doc(firestore, 'categories', currentCategory.id), { 
                            name: newName, 
                            description: newDescription 
                        });
                    }
                    break;
                case 'deleteCategory':
                    if (currentCategory) {
                        await deleteDoc(doc(firestore, 'categories', currentCategory.id));
                    }
                    break;
            }
            // Close only after success
            closeDialog();
            toast({ title: "Success", description: "Changes saved successfully." });

        } catch (error) {
            console.error("Error saving:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save changes. Please try again." });
            setIsSaving(false); // Stop loading but keep dialog open so user can retry
        }
    }
    
    const openDialog = (type: NonNullable<typeof dialogType>, unit?: Unit, category?: Category) => {
        setDialogType(type);
        if (unit) setCurrentUnit(unit);
        if (category) {
            setCurrentCategory(category)
            setNewName(category.name);
            setNewDescription(category.description || '');
        } else if (unit) {
            setNewName(unit.name);
            setNewDescription(unit.description || '');
        } else {
            setNewName('');
            setNewDescription('');
        }
    }

    const handleUnitDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (firestore && over && active.id !== over.id) {
            const oldIndex = sortedUnits.findIndex(u => u.id === active.id);
            const newIndex = sortedUnits.findIndex(u => u.id === over.id);
            const newOrder = arrayMove(sortedUnits, oldIndex, newIndex);
            
            const batch = writeBatch(firestore);
            newOrder.forEach((unit, index) => {
                const unitRef = doc(firestore, 'units', unit.id);
                batch.update(unitRef, { order: index });
            });
            await batch.commit();
        }
    }

    if (areUnitsLoading || areCategoriesLoading) {
         return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold font-headline">{userIsEditor ? 'Syllabus Builder' : 'Syllabus'}</h3>
                 {userIsEditor && <Button onClick={() => setDialogType('addUnit')}>
                    <PlusCircle className="mr-2" />
                    Add Unit
                </Button>}
            </div>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleUnitDragEnd}>
                <SortableContext items={sortedUnits.map(u => u.id)} strategy={verticalListSortingStrategy}>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {sortedUnits.map(unit => (
                            <SortableUnitItem
                                key={unit.id}
                                unit={unit}
                                categories={categoriesByUnit[unit.id] || []}
                                userIsEditor={userIsEditor}
                                openDialog={openDialog}
                            />
                        ))}
                    </Accordion>
                </SortableContext>
            </DndContext>
            
            {units?.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <p className="text-muted-foreground">No units found. {userIsEditor && 'Start by adding one.'}</p>
                    </CardContent>
                </Card>
            )}

            {/* Generic Dialog for Add/Edit */}
            <Dialog 
                open={!!(dialogType?.includes('add') || dialogType?.includes('edit'))} 
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogType?.includes('add') ? 'Add New' : 'Edit'} {dialogType?.includes('Unit') ? 'Unit' : 'Category'}</DialogTitle>
                         <DialogDescription>
                            {dialogType === 'addUnit' && `Create a new unit for ${subjectName}.`}
                            {dialogType === 'editUnit' && `Editing the unit: ${currentUnit?.name}.`}
                            {dialogType === 'addCategory' && `Create a new category for the unit: ${currentUnit?.name}.`}
                            {dialogType === 'editCategory' && `Editing the category: ${currentCategory?.name}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} disabled={isSaving} />
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={newDescription} onChange={e => setNewDescription(e.target.value)} disabled={isSaving} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic Delete Confirmation Dialog */}
            <AlertDialog open={!!dialogType?.includes('delete')} onOpenChange={(open) => !open && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {' '}
                            {dialogType === 'deleteUnit' ? `unit '${currentUnit?.name}' and all its categories.` : `category '${currentCategory?.name}'.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDialog} disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}