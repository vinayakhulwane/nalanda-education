'use client';

import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Question, Class, Subject, Unit, Category, CurrencyType } from "@/types";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { RichTextEditor } from '../rich-text-editor';
import { Upload } from 'lucide-react';

interface Step1Props {
  question: Question;
  setQuestion: Dispatch<SetStateAction<Question>>;
  onValidityChange: (isValid: boolean) => void;
  setUploadedQuestionData: Dispatch<SetStateAction<Partial<Question> | null>>;
}

export function Step1Metadata({ question, setQuestion, onValidityChange, setUploadedQuestionData }: Step1Props) {
  const firestore = useFirestore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);
        if (!jsonData.mainQuestionText) {
          alert("Invalid file: Missing main question text.");
          return;
        }
        // Use the dedicated state setter for uploaded data
        setUploadedQuestionData(jsonData);
      } catch (error) {
        console.error("Import Error:", error);
        alert("Failed to parse JSON. Please ensure the file is valid.");
      }
    };
    reader.readAsText(file);
  };

  const { data: classes } = useCollection<Class>(useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]));
  
  const subjectsQuery = useMemoFirebase(() => {
      if (!firestore || !question.classId) return null;
      return query(collection(firestore, 'subjects'), where('classId', '==', question.classId));
  }, [firestore, question.classId]);
  const { data: subjects } = useCollection<Subject>(subjectsQuery);

  const unitsQuery = useMemoFirebase(() => {
      if (!firestore || !question.subjectId) return null;
      return query(collection(firestore, 'units'), where('subjectId', '==', question.subjectId));
  }, [firestore, question.subjectId]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const allCategoriesQuery = useMemoFirebase(() => {
    if (!firestore || !subjects || subjects.length === 0) return null;
    const subjectIds = subjects.map(s => s.id);
    if (subjectIds.length === 0) return null;
    return query(collection(firestore, 'categories'), where('subjectId', 'in', subjectIds.slice(0, 30)));
  }, [firestore, subjects]);
  const { data: allCategories } = useCollection<Category>(allCategoriesQuery);
  
  const categoriesForUnit = useMemo(() => {
    if (!allCategories || !question.unitId) return [];
    return allCategories.filter(c => c.unitId === question.unitId);
  }, [allCategories, question.unitId]);


  const isFormValid = !!(
      question.name && 
      question.mainQuestionText && 
      question.classId && 
      question.subjectId && 
      question.unitId &&
      question.categoryId &&
      question.currencyType
  );

  useEffect(() => {
    onValidityChange(isFormValid);
  }, [isFormValid, onValidityChange]);

  const onFieldChange = (field: keyof Question, value: any) => {
    const updatedQuestion = { ...question, [field]: value };
    if (field === 'classId') {
        updatedQuestion.subjectId = '';
        updatedQuestion.unitId = '';
        updatedQuestion.categoryId = '';
    } else if (field === 'subjectId') {
        updatedQuestion.unitId = '';
        updatedQuestion.categoryId = '';
    } else if (field === 'unitId') {
        updatedQuestion.categoryId = '';
    }
    setQuestion(updatedQuestion);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">Metadata</h2>
          <p className="text-sm text-muted-foreground">Define the question identity and academic context.</p>
        </div>
        <div>
          <Label htmlFor="json-upload" className="cursor-pointer">
            <Button asChild variant="outline">
                <div>
                    <Upload className="mr-2 h-4 w-4" />
                    Import JSON
                </div>
            </Button>
          </Label>
          <Input 
            id="json-upload" 
            type="file" 
            accept=".json" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Question Name <span className="text-red-500">*</span></Label>
        <Input 
          value={question.name || ''} 
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder="Internal reference name (e.g., 'Newton 2nd Law Basic')"
        />
      </div>

      <div className="space-y-2">
        <Label>Main Question Text <span className="text-red-500">*</span></Label>
        <RichTextEditor
          value={question.mainQuestionText || ''}
          onChange={(val) => onFieldChange('mainQuestionText', val)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select 
            value={question.classId || ''} 
            onValueChange={(val) => onFieldChange('classId', val)}
          >
            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>
              {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select 
            value={question.subjectId || ''} 
            onValueChange={(val) => onFieldChange('subjectId', val)}
            disabled={!question.classId || !subjects || subjects.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
            <SelectContent>
              {subjects?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select 
            value={question.unitId || ''} 
            onValueChange={(val) => onFieldChange('unitId', val)}
            disabled={!question.subjectId || !units || units.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
            <SelectContent>
              {units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select 
            value={question.categoryId || ''} 
            onValueChange={(val) => onFieldChange('categoryId', val)}
            disabled={!question.unitId || !categoriesForUnit || categoriesForUnit.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
                {categoriesForUnit?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Currency Reward Type</Label>
        <Select 
          value={question.currencyType || 'spark'} 
          onValueChange={(val: CurrencyType) => onFieldChange('currencyType', val)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spark">Spark (Standard)</SelectItem>
            <SelectItem value="coin">Coin (Silver)</SelectItem>
            <SelectItem value="gold">Gold (High Value)</SelectItem>
            <SelectItem value="diamond">Diamond (Rare)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
