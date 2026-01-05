'use client';
import type { Category, Unit } from "@/types";
import { Button } from "../ui/button";
import { Edit, GripVertical, Trash } from "lucide-react";

type SortableCategoryItemProps = {
    category: Category;
    unit: Unit;
    userIsEditor: boolean;
    openDialog: (type: 'editCategory' | 'deleteCategory', unit: Unit, category: Category) => void;
};

export function SortableCategoryItem({ category, unit, userIsEditor, openDialog }: SortableCategoryItemProps) {
    return (
        <div
            className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
        >
            <div className="flex items-center">
                 {userIsEditor && <button className="cursor-grab p-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
                </button>}
                <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
            </div>
            {userIsEditor && (
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('editCategory', unit, category)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('deleteCategory', unit, category)}>
                        <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )}
        </div>
    );
}
