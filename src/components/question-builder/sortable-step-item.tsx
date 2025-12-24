'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { SolutionStep } from '@/types';
import { Button } from '@/components/ui/button';

export function SortableStepItem({ step, index, selectedStepId, setSelectedStepId, deleteStep }: { step: SolutionStep, index: number, selectedStepId: string | null, setSelectedStepId: (id: string) => void, deleteStep: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => setSelectedStepId(step.id)}
            className={`p-3 border rounded-md cursor-pointer flex items-center gap-2 ${selectedStepId === step.id ? 'bg-muted ring-2 ring-primary' : 'hover:bg-muted/50'}`}
        >
            <button {...attributes} {...listeners} className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="font-medium text-sm flex-grow">{index + 1}. {step.title}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}
