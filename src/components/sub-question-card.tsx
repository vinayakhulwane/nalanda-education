'use client';

import type { SubQuestion } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Copy, ImagePlus } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubQuestionCardProps {
    subQuestion: SubQuestion;
    updateSubQuestion: (subQuestion: SubQuestion) => void;
    deleteSubQuestion: (id: string) => void;
    duplicateSubQuestion: (id: string) => void;
}

export function SubQuestionCard({ subQuestion, updateSubQuestion, deleteSubQuestion, duplicateSubQuestion }: SubQuestionCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subQuestion.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const renderAnswerConfig = () => {
        switch (subQuestion.answerType) {
            case 'numerical':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Base Unit</Label>
                            <Input placeholder="e.g., N" />
                        </div>
                         <div className="space-y-2">
                             <Label>Correct Value</Label>
                            <Input type="number" placeholder="e.g., 100" />
                        </div>
                        <div className="space-y-2">
                             <Label>Tolerance (%)</Label>
                            <Input type="number" placeholder="e.g., 5" />
                        </div>
                        <div className="space-y-2">
                            <Label>Marks</Label>
                            <Input 
                                type="number" 
                                value={subQuestion.marks} 
                                onChange={e => updateSubQuestion({...subQuestion, marks: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                )
            case 'text':
                 return <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">Text answer configuration coming soon.</p>
            case 'mcq':
                return <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">MCQ answer configuration coming soon.</p>
            default:
                return null;
        }
    }


    return (
        <div ref={setNodeRef} style={style}>
            <Card className="bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <button {...attributes} {...listeners} className="cursor-grab">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </button>
                        <span className="font-semibold text-sm">Sub-Question</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateSubQuestion(subQuestion.id)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSubQuestion(subQuestion.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div>
                        <Label>Question Text</Label>
                        <RichTextEditor 
                            value={subQuestion.questionText} 
                            onChange={val => updateSubQuestion({...subQuestion, questionText: val})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Answer Type</Label>
                            <Select 
                                value={subQuestion.answerType} 
                                onValueChange={(val: SubQuestion['answerType']) => updateSubQuestion({...subQuestion, answerType: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="numerical">Numerical</SelectItem>
                                    <SelectItem value="text">Text / Short Answer</SelectItem>
                                    <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 self-end">
                            <Button variant="outline" className="w-full">
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Add Image
                            </Button>
                        </div>
                    </div>
                    
                    <div>
                        <Label>Answer Configuration</Label>
                        <div className="p-4 border rounded-md bg-background mt-2">
                            {renderAnswerConfig()}
                        </div>
                    </div>
                    
                </CardContent>
            </Card>
        </div>
    )
}
