import { CourseCard } from "@/components/course-card";
import { PageHeader } from "@/components/page-header";
import { mockCourses } from "@/lib/data";

export default function CoursesPage() {
  return (
    <div>
      <PageHeader
        title="My Courses"
        description="Here are all the courses you are currently enrolled in."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
