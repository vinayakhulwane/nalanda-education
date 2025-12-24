'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Question, SolutionStep } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StepEditor } from '../step-editor';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { SortableStepItem } from './sortable-step-item';

export function Step2SolutionBuilder({ onValidityChange, question, setQuestion } : { onValidityChange: (isValid: boolean) => void, question: Partial<Question>, setQuestion: (q: Partial<Question>) => void }) {
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    useEffect(() => {
        const steps = question.solutionSteps || [];
        // If there are steps but none is selected, select the first one.
        if (steps.length > 0 && !selectedStepId) {
            setSelectedStepId(steps[0].id);
        }
        // If the selected step is deleted, select the previous one or null.
        if (selectedStepId && !steps.find(s => s.id === selectedStepId)) {
            const lastStep = steps[steps.length - 1];
            setSelectedStepId(lastStep ? lastStep.id : null);
        }
    }, [question.solutionSteps, selectedStepId]);

    const handleAddStep = () => {
        const newStep: SolutionStep = {
            id: uuidv4(),
            title: `New Step ${ (question.solutionSteps?.length || 0) + 1}`,
            description: '',
            stepQuestion: '',
            subQuestions: [],
        };
        const newSteps = [...(question.solutionSteps || []), newStep];
        setQuestion({ ...question, solutionSteps: newSteps });
        setSelectedStepId(newStep.id);
    };

    const handleStepDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = question.solutionSteps?.findIndex(s => s.id === active.id) ?? -1;
            const newIndex = question.solutionSteps?.findIndex(s => s.id === over.id) ?? -1;
            if (oldIndex !== -1 && newIndex !== -1) {
                const newSteps = arrayMove(question.solutionSteps!, oldIndex, newIndex);
                setQuestion({ ...question, solutionSteps: newSteps });
            }
        }
    };

    const selectedStep = useMemo(() => {
        return question.solutionSteps?.find(s => s.id === selectedStepId);
    }, [question.solutionSteps, selectedStepId]);
    
    const updateStep = (updatedStep: SolutionStep) => {
        const newSteps = question.solutionSteps?.map(s => s.id === updatedStep.id ? updatedStep : s);
        setQuestion({...question, solutionSteps: newSteps});
    }

    const deleteStep = (stepId: string) => {
        const newSteps = question.solutionSteps?.filter(s => s.id !== stepId);
        setQuestion({...question, solutionSteps: newSteps});
    }
    
    const isStepValid = !!question.solutionSteps && question.solutionSteps.length > 0;
     useEffect(() => {
        onValidityChange(isStepValid);
    }, [isStepValid, onValidityChange]);


    return (
        <div className="grid md:grid-cols-3 gap-6">
            {/* Left Panel: Step List */}
            <div className="md:col-span-1 space-y-2">
                 <div className="space-y-2">
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
                        <SortableContext items={question.solutionSteps?.map(s => s.id) || []} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {question.solutionSteps?.map((step, index) => (
                                    <SortableStepItem
                                        key={step.id}
                                        step={step}
                                        index={index}
                                        selectedStepId={selectedStepId}
                                        setSelectedStepId={setSelectedStepId}
                                        deleteStep={deleteStep}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {(!question.solutionSteps || question.solutionSteps.length === 0) && (
                        <div className="text-center text-sm text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            No steps created yet. <br /> Click "Add Step" to begin.
                        </div>
                    )}
                 </div>
                 <div className="pt-2">
                    <Button onClick={handleAddStep} className="w-full" variant="outline">
                        <Plus className="mr-2" /> Add Step
                    </Button>
                </div>
            </div>

            {/* Right Panel: Step Editor */}
            <div className="md:col-span-2">
                {selectedStep ? (
                    <StepEditor key={selectedStep.id} step={selectedStep} updateStep={updateStep} />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-center border-2 border-dashed rounded-lg p-8">
                        Select a step on the left to edit it, or add a new one.
                    </div>
                )}
            </div>
        </div>
    );
}
