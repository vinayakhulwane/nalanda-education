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
  completedWorksheets?: string[];
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
  id:string;
  name: string;
  title?: string;
  description: string;
  classId: string;
  customTabs?: CustomTab[];
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  unitId: string;
  order: number;
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
export type SubQuestionType = 'numerical' | 'text' | 'mcq';
export type GradingMode = 'system' | 'ai';

export interface McqOption {
  id: string;
  text: string;
}

export interface SubQuestion {
  id: string;
  questionText: string;
  image?: string;
  answerType: SubQuestionType;
  marks: number;
  // Numerical Answer
  numericalAnswer?: {
    baseUnit: string;
    correctValue: number;
    allowedUnits: string[];
    defaultUnit: string;
    toleranceType: 'absolute' | 'percentage';
    toleranceValue: number;
  };
  // Text Answer
  textAnswer?: {
    keywords: string[];
    matchLogic: 'any' | 'all' | 'exact';
    caseSensitive: boolean;
  };
  // MCQ Answer
  mcqAnswer?: {
    options: McqOption[];
    correctOptions: string[]; // array of option ids
    isMultiCorrect: boolean;
    shuffleOptions: boolean;
  };
}

export interface SolutionStep {
  id: string;
  title: string;
  description: string;
  stepImage?: string;
  stepQuestion: string;
  subQuestions: SubQuestion[];
}

export type AIRubricKey = 'problemUnderstanding' | 'formulaSelection' | 'substitution' | 'calculationAccuracy' | 'finalAnswer' | 'presentationClarity';

export type AIRubric = Record<AIRubricKey, number>;

export type AIFeedbackPattern = 'consistency' | 'examReadiness' | 'calculationError' | 'conceptualMisconception' | 'alternativeMethods' | 'commonPitfalls' | 'realWorldConnection' | 'nextSteps';


export interface Question {
  id: string;
  // Step 1: Metadata
  name: string;
  mainQuestionText: string;
  mainImage?: string;
  classId: string;
  subjectId: string;
  unitId: string;
  categoryId: string;
  currencyType: CurrencyType;
  // Step 2: Steps
  solutionSteps: SolutionStep[];
  // Step 4: Grading
  gradingMode: GradingMode;
  aiRubric?: AIRubric;
  aiFeedbackPatterns?: AIFeedbackPattern[];
  // Status
  status: 'draft' | 'published';
  authorId: string;
}

export type QuestionFilter = 'unit' | 'category' | 'status' | 'currency';


export interface Worksheet {
    id: string;
    title: string;
    classId: string;
    subjectId: string;
    unitId?: string;
    mode: 'practice' | 'exam';
    worksheetType: 'classroom' | 'sample' | 'practice';
    startTime?: Date; // For exam mode
    questions: string[]; // Array of question IDs
    authorId: string;
    status: 'draft' | 'published';
    createdAt: any; // Firestore ServerTimestamp
    updatedAt: any; // Firestore ServerTimestamp
}

export interface WorksheetAttempt {
    id: string;
    userId: string;
    worksheetId: string;
    answers: Record<string, { answer: any }>;
    results: Record<string, { isCorrect: boolean }>;
    timeTaken: number;
    attemptedAt: any; // Firestore ServerTimestamp
    rewardsClaimed?: boolean;
}


export interface EconomySettings {
    coinsPerGold: number;
    goldPerDiamond: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent';
  description: string;
  amount: number;
  currency: CurrencyType;
  createdAt: any; // Firestore ServerTimestamp
}
