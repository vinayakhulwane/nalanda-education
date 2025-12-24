'use client';
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  coins: number;
  gold: number;
  diamonds: number;
  active?: boolean;
  enrollments?: string[];
}

export interface Class {
  id: string;
  name: string;
  description: string;
}

export interface CustomTab {
    id: string;
    label: string;
    content: string;
    hidden?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  classId: string;
  customTabs?: CustomTab[];
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  subjectId: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  unitId: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  imageUrl: string;
}

export interface Student extends User {
  role: 'student';
  courses: Course[];
  academicHealth: number;
}

export interface Teacher extends User {
  role: 'teacher';
  classes: string[];
}

export type CurrencyType = 'spark' | 'coin' | 'gold' | 'diamond';
export type SubQuestionType = 'numerical' | 'text';
export type GradingMode = 'system' | 'ai';

export interface SubQuestion {
  id: string;
  type: SubQuestionType;
  prompt: string;
  marks: number;
  // Numerical answer
  correctValue?: number;
  tolerance?: number;
  // Text answer
  keywords?: string[];
}

export interface SolutionStep {
  id: string;
  title: string;
  description: string;
  stepQuestion: string;
  subQuestions: SubQuestion[];
}

export interface AIRubric {
  problemUnderstanding: number;
  formulaSelection: number;
  substitution: number;
  calculationAccuracy: number;
  finalAnswer: number;
  presentationClarity: number;
}

export interface Question {
  id: string;
  // Step 1: Metadata
  name: string;
  mainQuestionText: string;
  unitId: string;
  categoryId: string;
  currencyType: CurrencyType;
  // Step 2: Steps
  solutionSteps: SolutionStep[];
  // Step 4: Grading
  gradingMode: GradingMode;
  aiRubric?: AIRubric;
  // Status
  status: 'draft' | 'published';
  authorId: string;
}
