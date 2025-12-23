import { StudentDashboard } from "@/components/student-dashboard";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { mockStudent, mockTeacher, mockCourses } from "@/lib/data";

// In a real app, this would come from a session or API call
const role: 'student' | 'teacher' = 'student';

export default function DashboardPage() {
  if (role === 'student') {
    return <StudentDashboard user={mockStudent} courses={mockCourses} />;
  }
  
  if (role === 'teacher') {
    return <TeacherDashboard user={mockTeacher} />;
  }

  return null;
}
