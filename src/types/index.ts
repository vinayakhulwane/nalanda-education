'use client';
// ==========================================
// 1. CORE ENUMS & CONSTANTS
// ==========================================
export type CurrencyType = 'spark' | 'coin' | 'gold' | 'diamond' | 'aiCredits';

export type GradingMode = 'system' | 'ai';

export type QuestionStatus = 'draft' | 'published' | 'archived';

export type AnswerType = 'numerical' | 'text' | 'mcq'; // Added MCQ for Step 1 logic

// ==========================================
// 2. RUBRIC STRUCTURE (For AI Grading)
// ==========================================
export type AIRubricKey = 'problemUnderstanding' | 'formulaSelection' | 'substitution' | 'calculationAccuracy' | 'finalAnswer' | 'presentationClarity';

export type AIRubric = Record<AIRubricKey, number>;

export type AIFeedbackPattern = 'givenRequiredMapping' | 'conceptualMisconception' | 'stepSequence' | 'calculationMistake' | 'unitsDimensions' | 'commonPitfalls' | 'answerPresentation' | 'nextSteps';


// ==========================================
// 3. STEP & SUB-QUESTION STRUCTURE
// ==========================================
export interface NumericalAnswer {
  correctValue: number;
  toleranceValue: number; // Mandatory for numerical
  baseUnit: string;
}

export interface McqOption {
    id: string;
    text: string;
}

export interface McqAnswer {
  options: McqOption[];
  correctOptions: string[]; // UUIDs
  isMultiCorrect: boolean;
  shuffleOptions: boolean;
}

export interface SubQuestion {
  id: string;
  questionText: string;
  marks: number;
  answerType: AnswerType;
  // One of these must be populated based on answerType
  numericalAnswer?: NumericalAnswer;
  mcqAnswer?: McqAnswer; 
  textAnswerKeywords?: string[]; // For text matching
}

export interface SolutionStep {
  id: string;
  title: string;
  description: string; // "Step Description"
  stepQuestion: string; // "Step Question"
  subQuestions: SubQuestion[];
}

// ==========================================
// 4. THE MASTER QUESTION OBJECT
// ==========================================
export interface Question {
  // Metadata (Step 1)
  id: string;
  name: string; // Internal Name
  mainQuestionText: string; // Problem Statement
  authorId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  categoryId: string;
  currencyType: CurrencyType;
  
  // The Solution Engine (Step 2)
  solutionSteps: SolutionStep[];

  // Grading Logic (Step 4)
  gradingMode: GradingMode;
  aiRubric?: AIRubric; // Required if gradingMode === 'ai'
  aiFeedbackPatterns: AIFeedbackPattern[]; // e.g., ['calculation_error', 'conceptual_misconception']

  // System State (Step 3 & 5)
  status: QuestionStatus;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
  publishedAt?: { seconds: number; nanoseconds: number };
}

// --- Other existing types ---

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
  aiCredits?: number;
  active?: boolean;
  enrollments?: string[];
  completedWorksheets?: string[];
  unlockedTabs?: string[];
  unlockedSolutions?: string[];
  lastCouponClaimedAt?: any; // Firestore Timestamp
  hasClaimedWelcomeCoupon?: boolean;
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
    cost?: number;
    currency?: CurrencyType;
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

export type AnswerState = { [subQuestionId: string]: { answer: any } };
export type ResultState = {
  [subQuestionId: string]: {
    isCorrect: boolean;
    score?: number;       // ✅ Added: Optional score for AI grading
    feedback?: string;    // ✅ Added: Optional text feedback from AI
  }
};


export interface WorksheetAttempt {
    id: string;
    userId: string;
    worksheetId: string;
    answers: AnswerState;
    results: ResultState;
    timeTaken: number;
    attemptedAt: any; // Firestore ServerTimestamp
    rewardsClaimed?: boolean;
    
    // ✅ NEW: Track purchased solutions (QuestionID -> Solution Text)
    unlockedSolutions?: Record<string, string>; 
}


export interface EconomySettings {
  // Exchange Rates
  coinToGold: number;
  goldToDiamond: number;

  // Creation Costs
  costPerMark: number;
  solutionCost?: number; 
  solutionCurrency?: CurrencyType;

  // Reward Multipliers
  rewardPractice: number;
  rewardClassroom: number;
  rewardSpark: number;
  
  // Surprise Coupon Settings
  welcomeAiCredits?: number;
  surpriseRewardAmount?: number;
  surpriseRewardCurrency?: CurrencyType;
  nextCouponAvailableDate?: any; // Firestore Timestamp
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

export interface WalletTransaction {
    coins: number;
    gold: number;
    diamonds: number;
    aiCredits?: number;
}
