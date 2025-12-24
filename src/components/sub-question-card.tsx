'use client';

import type { SubQuestion, McqOption } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Copy, ImagePlus, AlertCircle, Plus, X, ChevronDown } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Switch } from './ui/switch';
import { v4 as uuidv4 } from 'uuid';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useState } from 'react';

interface SubQuestionCardProps {
    subQuestion: SubQuestion;
    updateSubQuestion: (subQuestion: SubQuestion) => void;
    deleteSubQuestion: (id: string) => void;
    duplicateSubQuestion: (id: string) => void;
}

export function SubQuestionCard({ subQuestion, updateSubQuestion, deleteSubQuestion, duplicateSubQuestion }: SubQuestionCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subQuestion.id });
    const [isOpen, setIsOpen] = useState(true);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getPlainText = (html: string) => {
        if (!html) return '';
        // First, replace common block tags with spaces, then strip all tags, then decode &nbsp;
        return html
            .replace(/<\/p>/gi, ' ')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>?/gm, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    const previewText = (text: string, maxLength: number = 50) => {
        if (!text) return 'No question text yet...';
        const plainText = getPlainText(text);
        if (plainText.length > maxLength) {
            return plainText.substring(0, maxLength) + '...';
        }
        return plainText;
    }

    const handleMcqChange = (field: string, value: any) => {
        const mcqAnswer = { ...subQuestion.mcqAnswer, [field]: value };
        // When switching from multi to single, keep only the first correct answer
        if (field === 'isMultiCorrect' && !value && mcqAnswer.correctOptions.length > 1) {
            mcqAnswer.correctOptions = [mcqAnswer.correctOptions[0]];
        }
        updateSubQuestion({ ...subQuestion, mcqAnswer });
    }

    const handleOptionTextChange = (optionId: string, newText: string) => {
        const updatedOptions = subQuestion.mcqAnswer?.options.map(opt =>
            opt.id === optionId ? { ...opt, text: newText } : opt
        );
        handleMcqChange('options', updatedOptions);
    };

    const handleCorrectOptionChange = (optionId: string) => {
        if (subQuestion.mcqAnswer?.isMultiCorrect) {
            const currentCorrect = subQuestion.mcqAnswer.correctOptions || [];
            const newCorrect = currentCorrect.includes(optionId)
                ? currentCorrect.filter(id => id !== optionId)
                : [...currentCorrect, optionId];
            handleMcqChange('correctOptions', newCorrect);
        } else {
            handleMcqChange('correctOptions', [optionId]);
        }
    };
    
    const handleAddOption = () => {
        const options = subQuestion.mcqAnswer?.options || [];
        if (options.length >= 6) return;
        const newOption: McqOption = { id: uuidv4(), text: '' };
        handleMcqChange('options', [...options, newOption]);
    };

    const handleDeleteOption = (optionId: string) => {
        const updatedOptions = subQuestion.mcqAnswer?.options.filter(opt => opt.id !== optionId);
        const updatedCorrectOptions = subQuestion.mcqAnswer?.correctOptions.filter(id => id !== optionId);
        updateSubQuestion({ ...subQuestion, mcqAnswer: { ...subQuestion.mcqAnswer!, options: updatedOptions!, correctOptions: updatedCorrectOptions! }});
    };


    const renderAnswerConfig = () => {
        switch (subQuestion.answerType) {
            case 'numerical':
                const numerical = subQuestion.numericalAnswer;
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Base Unit</Label>
                            <Input 
                                placeholder="e.g., N" 
                                value={numerical?.baseUnit || ''}
                                onChange={e => updateSubQuestion({...subQuestion, numericalAnswer: {...numerical, baseUnit: e.target.value}})}
                            />
                        </div>
                         <div className="space-y-2">
                             <Label>Correct Value</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g., 100" 
                                value={numerical?.correctValue || ''}
                                onChange={e => updateSubQuestion({...subQuestion, numericalAnswer: {...numerical, correctValue: parseFloat(e.target.value) || 0}})}
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Tolerance (%)</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g., 5"
                                value={numerical?.toleranceValue || ''}
                                onChange={e => updateSubQuestion({...subQuestion, numericalAnswer: {...numerical, toleranceValue: parseFloat(e.target.value) || 0}})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Marks</Label>
                            <Input 
                                type="number" 
                                value={subQuestion.marks || ''} 
                                onChange={e => updateSubQuestion({...subQuestion, marks: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                )
            case 'text':
                return (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Heads up!</AlertTitle>
                            <AlertDescription>
                                Text answers are evaluated by keyword matching. Use MCQ where possible.
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>Keywords</Label>
                            <Input
                                placeholder="Enter keywords, separated by commas"
                                value={subQuestion.textAnswer?.keywords?.join(', ') || ''}
                                onChange={e => updateSubQuestion({
                                    ...subQuestion,
                                    textAnswer: { ...subQuestion.textAnswer!, keywords: e.target.value.split(',').map(k => k.trim()) }
                                })}
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Match Logic</Label>
                                <Select
                                    value={subQuestion.textAnswer?.matchLogic || 'any'}
                                    onValueChange={(val: 'any' | 'all' | 'exact') => updateSubQuestion({
                                        ...subQuestion,
                                        textAnswer: { ...subQuestion.textAnswer!, matchLogic: val }
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">ANY keyword must match (OR)</SelectItem>
                                        <SelectItem value="all">ALL keywords must match (AND)</SelectItem>
                                        <SelectItem value="exact">Exact match only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="flex items-center space-x-2 rounded-md border p-3 mt-4 md:mt-0">
                                <Switch
                                    id={`case-sensitive-${subQuestion.id}`}
                                    checked={subQuestion.textAnswer?.caseSensitive || false}
                                    onCheckedChange={checked => updateSubQuestion({
                                        ...subQuestion,
                                        textAnswer: { ...subQuestion.textAnswer!, caseSensitive: checked }
                                    })}
                                />
                                <Label htmlFor={`case-sensitive-${subQuestion.id}`} className="text-sm">
                                    Case Sensitive
                                </Label>
                            </div>
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
                );
             case 'mcq':
                const mcq = subQuestion.mcqAnswer;
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id={`multi-correct-${subQuestion.id}`}
                                    checked={mcq?.isMultiCorrect}
                                    onCheckedChange={checked => handleMcqChange('isMultiCorrect', checked)}
                                />
                                <Label htmlFor={`multi-correct-${subQuestion.id}`}>Multiple Correct Answers</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                 <Switch
                                    id={`shuffle-${subQuestion.id}`}
                                    checked={mcq?.shuffleOptions ?? true}
                                    onCheckedChange={checked => handleMcqChange('shuffleOptions', checked)}
                                />
                                <Label htmlFor={`shuffle-${subQuestion.id}`}>Shuffle Options</Label>
                            </div>
                        </div>
                        
                        <div>
                            <Label>Options</Label>
                            <div className="space-y-2 mt-2">
                                {mcq?.isMultiCorrect ? (
                                    // Checkbox Group for Multiple Correct
                                     mcq.options.map((option, index) => (
                                        <div key={option.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`option-check-${option.id}`}
                                                checked={mcq.correctOptions.includes(option.id)}
                                                onCheckedChange={() => handleCorrectOptionChange(option.id)}
                                            />
                                            <Input value={option.text} onChange={(e) => handleOptionTextChange(option.id, e.target.value)} className="flex-grow" placeholder={`Option ${index + 1}`} />
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteOption(option.id)} disabled={mcq.options.length <= 2}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    // Radio Group for Single Correct
                                    <RadioGroup
                                        value={mcq.correctOptions?.[0]}
                                        onValueChange={handleCorrectOptionChange}
                                    >
                                        {mcq.options.map((option, index) => (
                                            <div key={option.id} className="flex items-center gap-2">
                                                <RadioGroupItem value={option.id} id={`option-radio-${option.id}`} />
                                                <Input value={option.text} onChange={(e) => handleOptionTextChange(option.id, e.target.value)} className="flex-grow" placeholder={`Option ${index + 1}`}/>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteOption(option.id)} disabled={mcq.options.length <= 2}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}

                                {(!mcq?.options || mcq.options.length < 6) && (
                                     <Button variant="outline" size="sm" onClick={handleAddOption} className="mt-2">
                                        <Plus className="mr-2 h-4 w-4" /> Add Option
                                    </Button>
                                )}
                            </div>
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
            default:
                return null;
        }
    }

    const handleAnswerTypeChange = (value: SubQuestion['answerType']) => {
        const baseUpdate = { ...subQuestion, answerType: value };
        // Set default structures when switching to a new type
        if (value === 'mcq' && !baseUpdate.mcqAnswer) {
            baseUpdate.mcqAnswer = {
                options: [{id: uuidv4(), text: ''}, {id: uuidv4(), text: ''}],
                correctOptions: [],
                isMultiCorrect: false,
                shuffleOptions: true,
            };
        } else if (value === 'text' && !baseUpdate.textAnswer) {
            baseUpdate.textAnswer = {
                keywords: [],
                matchLogic: 'any',
                caseSensitive: false,
            };
        } else if (value === 'numerical' && !baseUpdate.numericalAnswer) {
             baseUpdate.numericalAnswer = {
                baseUnit: '',
                correctValue: 0,
                allowedUnits: [],
                defaultUnit: '',
                toleranceType: 'percentage',
                toleranceValue: 5,
            };
        }
        updateSubQuestion(baseUpdate);
    };


    return (
        <div ref={setNodeRef} style={style}>
            <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
                <Card className="bg-muted/30">
                    <CollapsibleTrigger asChild>
                        <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/50 rounded-t-lg cursor-pointer">
                            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                <button {...attributes} {...listeners} className="cursor-grab" onClick={(e) => e.stopPropagation()}>
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </button>
                                <span className="font-semibold text-sm truncate">
                                    {isOpen ? 'Sub-Question' : previewText(subQuestion.questionText)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); duplicateSubQuestion(subQuestion.id);}}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteSubQuestion(subQuestion.id); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                 <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
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
                                        onValueChange={(val: SubQuestion['answerType']) => handleAnswerTypeChange(val)}
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
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </div>
    )
}
