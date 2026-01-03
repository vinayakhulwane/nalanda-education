
'use client';
// ==========================================
// 1. CORE ENUMS & CONSTANTS
// ==========================================
export type CurrencyType = 'spark' | 'coin' | 'gold' | 'diamond' | 'aiCredits';

export type GradingMode = 'system' | 'ai';

export type QuestionStatus = 'draft' | 'published' | 'archived';

export type AnswerType = 'numerical' | 'text' | 'mcq';

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
  toleranceValue: number; 
  baseUnit: string;
}

export interface McqOption {
    id: string;
    text: string;
}

export interface McqAnswer {
  options: McqOption[];
  correctOptions: string[]; 
  isMultiCorrect: boolean;
  shuffleOptions: boolean;
}

export interface SubQuestion {
  id: string;
  questionText: string;
  marks: number;
  answerType: AnswerType;
  numericalAnswer?: NumericalAnswer;
  mcqAnswer?: McqAnswer; 
  textAnswerKeywords?: string[]; 
}

export interface SolutionStep {
  id: string;
  title: string;
  description: string; 
  stepQuestion: string; 
  subQuestions: SubQuestion[];
}

// ==========================================
// 4. THE MASTER QUESTION OBJECT
// ==========================================
export interface Question {
  id: string;
  name: string; 
  mainQuestionText: string; 
  authorId: string;
  classId: string;
  subjectId: string;
  unitId: string;
  categoryId: string;
  currencyType: CurrencyType;
  solutionSteps: SolutionStep[];
  gradingMode: GradingMode;
  aiRubric?: AIRubric; 
  aiFeedbackPatterns: AIFeedbackPattern[]; 
  status: QuestionStatus;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
  publishedAt?: { seconds: number; nanoseconds: number };
}

// ==========================================
// 5. COUPON & ECONOMY
// ==========================================
export interface CouponCondition {
    type: 'minClassroomAssignments' | 'minPracticeAssignments' | 'minGoldQuestions' | 'minAcademicHealth';
    value: number;
}

export interface Coupon {
    id: string;
    name: string;
    rewardAmount: number;
    rewardCurrency: CurrencyType;
    availableDate: any; // Firestore Timestamp
    conditions: CouponCondition[];
    createdAt?: any;
    updatedAt?: any;
}

export interface EconomySettings {
  coinToGold: number;
  goldToDiamond: number;
  costPerMark: number;
  aiGradingCostMultiplier?: number;
  solutionCost?: number; 
  solutionCurrency?: CurrencyType;
  rewardPractice: number;
  rewardClassroom: number;
  rewardSpark: number;
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
  unlockedSolutions?: Record<string, string>;
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
    startTime?: Date; 
    questions: string[]; 
    authorId: string;
    status: 'draft' | 'published';
    createdAt: any; 
    updatedAt: any; 
}

export type AnswerState = { [subQuestionId: string]: { answer: any } };
export type ResultState = {
  [subQuestionId: string]: {
    isCorrect: boolean;
    score?: number;       
    feedback?: string;    
    aiBreakdown?: Record<string, number>;
  }
};


export interface WorksheetAttempt {
    id: string;
    userId: string;
    worksheetId: string;
    answers: AnswerState;
    results: ResultState;
    timeTaken: number;
    attemptedAt: any; 
    rewardsClaimed?: boolean;
    unlockedSolutions?: Record<string, string>; 
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent';
  description: string;
  amount: number;
  currency: CurrencyType;
  createdAt: any;
}

export interface WalletTransaction {
    coins: number;
    gold: number;
    diamonds: number;
    aiCredits?: number;
}
