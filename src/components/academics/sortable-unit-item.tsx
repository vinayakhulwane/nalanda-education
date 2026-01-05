'use client';
import type { Unit, Category } from "@/types";
import { AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { GripVertical, MoreVertical, Plus } from "lucide-react";
import { SortableCategoryItem } from './sortable-category-item';

type SortableUnitItemProps = {
    unit: Unit;
    categories: Category[];
    userIsEditor: boolean;
    openDialog: (type: any, unit: Unit, category?: Category) => void;
};

export function SortableUnitItem({ unit, categories, userIsEditor, openDialog }: SortableUnitItemProps) {

    return (
        <div>
            <AccordionItem value={unit.id} className="bg-card border rounded-lg px-4">
                <div className="flex items-center">
                    {userIsEditor && <button className="cursor-grab p-1">
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
                        {categories.map(category => (
                            <SortableCategoryItem
                                key={category.id}
                                category={category}
                                unit={unit}
                                userIsEditor={userIsEditor}
                                openDialog={openDialog}
                            />
                        ))}
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
