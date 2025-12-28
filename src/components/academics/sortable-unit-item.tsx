'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Unit, Category } from "@/types";
import { AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { GripVertical, MoreVertical, Plus } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCategoryItem } from './sortable-category-item';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';

type SortableUnitItemProps = {
    unit: Unit;
    categories: Category[];
    userIsEditor: boolean;
    openDialog: (type: any, unit: Unit, category?: Category) => void;
};

export function SortableUnitItem({ unit, categories, userIsEditor, openDialog }: SortableUnitItemProps) {
    const firestore = useFirestore();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: unit.id, disabled: !userIsEditor });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleCategoryDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (firestore && over && active.id !== over.id) {
            const oldIndex = categories.findIndex(c => c.id === active.id);
            const newIndex = categories.findIndex(c => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);

            const batch = writeBatch(firestore);
            newOrder.forEach((category, index) => {
                const categoryRef = doc(firestore, 'categories', category.id);
                batch.update(categoryRef, { order: index });
            });
            await batch.commit();
        }
    }

    return (
        <div ref={setNodeRef} style={style}>
            <AccordionItem value={unit.id} className="bg-card border rounded-lg px-4">
                <div className="flex items-center">
                    {userIsEditor && <button {...attributes} {...listeners} className="cursor-grab p-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
                    </button>}
                    <AccordionTrigger className="text-lg font-headline hover:no-underline flex-1">
                        {unit.name}
                    </AccordionTrigger>
                    {userIsEditor && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog('editUnit', unit)}>Edit Unit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDialog('addCategory', unit)}>Add Category</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDialog('deleteUnit', unit)} className="text-destructive focus:text-destructive">Delete Unit</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <AccordionContent>
                    <p className="text-muted-foreground text-sm pb-4">{unit.description}</p>
                    <div className="space-y-2 pl-6 border-l-2 ml-3">
                         <DndContext collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                {categories.map(category => (
                                    <SortableCategoryItem
                                        key={category.id}
                                        category={category}
                                        unit={unit}
                                        userIsEditor={userIsEditor}
                                        openDialog={openDialog}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                        {categories.length === 0 && (
                            <p className="text-sm text-muted-foreground py-4">No categories in this unit.</p>
                        )}
                        {userIsEditor && (
                             <Button 
                                variant="ghost" 
                                className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                                onClick={() => openDialog('addCategory', unit)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </div>
    );
}
