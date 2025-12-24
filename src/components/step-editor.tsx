'use client';
import { useState } from 'react';
import type { SolutionStep, SubQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SubQuestionCard } from './sub-question-card';

interface StepEditorProps {
  step: SolutionStep;
  updateStep: (step: SolutionStep) => void;
}

export function StepEditor({ step, updateStep }: StepEditorProps) {
    const handleAddSubQuestion = () => {
        const newSubQuestion: SubQuestion = {
            id: uuidv4(),
            questionText: '',
            answerType: 'numerical',
            marks: 0,
        };
        const updatedStep = { ...step, subQuestions: [...step.subQuestions, newSubQuestion] };
        updateStep(updatedStep);
    };

    const updateSubQuestion = (updatedSub: SubQuestion) => {
        const updatedSubQuestions = step.subQuestions.map(sq => sq.id === updatedSub.id ? updatedSub : sq);
        updateStep({ ...step, subQuestions: updatedSubQuestions });
    };

    const deleteSubQuestion = (id: string) => {
        const updatedSubQuestions = step.subQuestions.filter(sq => sq.id !== id);
        updateStep({ ...step, subQuestions: updatedSubQuestions });
    };

    const duplicateSubQuestion = (id: string) => {
        const original = step.subQuestions.find(sq => sq.id === id);
        if (original) {
            const newSubQuestion = { ...original, id: uuidv4() };
            const index = step.subQuestions.findIndex(sq => sq.id === id);
            const updatedSubQuestions = [...step.subQuestions];
            updatedSubQuestions.splice(index + 1, 0, newSubQuestion);
            updateStep({ ...step, subQuestions: updatedSubQuestions });
        }
    };
    
    const handleSubQuestionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = step.subQuestions.findIndex(sq => sq.id === active.id);
            const newIndex = step.subQuestions.findIndex(sq => sq.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedSubQuestions = arrayMove(step.subQuestions, oldIndex, newIndex);
                updateStep({ ...step, subQuestions: reorderedSubQuestions });
            }
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-card space-y-6">
            <div className="space-y-2">
                <Label htmlFor="step-title">Step Title</Label>
                <Input
                    id="step-title"
                    value={step.title}
                    onChange={(e) => updateStep({ ...step, title: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="step-description">Step Description (Optional)</Label>
                <Textarea
                    id="step-description"
                    value={step.description}
                    onChange={(e) => updateStep({ ...step, description: e.target.value })}
                    rows={2}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="step-question">Step Question</Label>
                <Textarea
                    id="step-question"
                    value={step.stepQuestion}
                    onChange={(e) => updateStep({ ...step, stepQuestion: e.target.value })}
                    placeholder="The prompt for the student at this step."
                    rows={3}
                />
            </div>
            
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium">Sub-Questions</h4>
                    <Button size="sm" onClick={handleAddSubQuestion}>
                        <Plus className="mr-2 h-4 w-4" /> Add Sub-Question
                    </Button>
                </div>
                 <DndContext collisionDetection={closestCenter} onDragEnd={handleSubQuestionDragEnd}>
                    <SortableContext items={step.subQuestions.map(sq => sq.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                            {step.subQuestions.map((subQuestion) => (
                                <SubQuestionCard 
                                    key={subQuestion.id}
                                    subQuestion={subQuestion} 
                                    updateSubQuestion={updateSubQuestion}
                                    deleteSubQuestion={deleteSubQuestion}
                                    duplicateSubQuestion={duplicateSubQuestion}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                {step.subQuestions.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        No sub-questions added yet.
                    </div>
                )}
            </div>
        </div>
    );
}
