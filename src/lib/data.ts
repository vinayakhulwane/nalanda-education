import type { User, Course, Question } from '@/types';
import { PlaceHolderImages } from './placeholder-images';

function getImageUrl(id: string): string {
    return PlaceHolderImages.find(p => p.id === id)?.imageUrl ?? 'https://picsum.photos/seed/default/200/300';
}

export const mockStudent: User = {
  id: '1',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  role: 'student',
  coins: 1250,
  gold: 200,
  diamonds: 15,
};

export const mockTeacher: User = {
    id: '2',
    name: 'Dr. Evelyn Reed',
    email: 'e.reed@example.com',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e',
    role: 'teacher',
    coins: 9999,
    gold: 999,
    diamonds: 99,
};


export const mockCourses: Course[] = [
    { id: '1', title: 'Algebra I', subject: 'Mathematics', description: 'Fundamental concepts of algebra.', progress: 75, imageUrl: getImageUrl('course-algebra') },
    { id: '2', title: 'Geometry', subject: 'Mathematics', description: 'Study of shapes, sizes, and properties of space.', progress: 45, imageUrl: getImageUrl('course-geometry') },
    { id: '3', title: 'Calculus I', subject: 'Mathematics', description: 'Introduction to differential and integral calculus.', progress: 60, imageUrl: getImageUrl('course-calculus') },
    { id: '4', title: 'Statistics', subject: 'Mathematics', description: 'Collecting, analyzing, and interpreting data.', progress: 20, imageUrl: getImageUrl('course-statistics') },
];

export const mockQuestions: Question[] = [
    { id: 'q1', title: 'Simple Addition', content: 'What is 2 + 2?', subject: 'Arithmetic', topic: 'Addition' },
    { id: 'q2', title: 'Quadratic Equation', content: 'Solve for x: x^2 - 5x + 6 = 0', subject: 'Algebra I', topic: 'Quadratics' },
    { id: 'q3', title: 'Area of a Circle', content: 'What is the area of a circle with radius 5?', subject: 'Geometry', topic: 'Circles' },
    { id: 'q4', title: 'Derivative of x^2', content: 'Find the derivative of f(x) = x^2.', subject: 'Calculus I', topic: 'Derivatives' },
    { id: 'q5', title: 'Mean of a set', content: 'Find the mean of the numbers: 2, 4, 6, 8.', subject: 'Statistics', topic: 'Averages' },
    { id: 'q6', title: 'Pythagorean Theorem', content: 'A right triangle has legs of length 3 and 4. What is the length of the hypotenuse?', subject: 'Geometry', topic: 'Triangles' },
    { id: 'q7', title: 'Factoring Trinomials', content: 'Factor the trinomial: x^2 + 7x + 12', subject: 'Algebra I', topic: 'Factoring' },
];
