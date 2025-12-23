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

export interface Question {
  id: string;
  title: string;
  content: string;
  subject: string;
  topic: string;
}
