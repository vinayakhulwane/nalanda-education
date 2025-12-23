'use client';
import type { User, Course } from "@/types";
import { PageHeader } from "./page-header";
import { StatsCard } from "./stats-card";
import { BookOpen, Target, CheckCircle } from "lucide-react";
import { CourseCard } from "./course-card";
import { Button } from "./ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type StudentDashboardProps = {
    user: User;
    courses: Course[];
}

export function StudentDashboard({ user, courses }: StudentDashboardProps) {
    return (
        <div>
            <PageHeader
                title={`Welcome back, ${user.name.split(' ')[0]}!`}
                description="Here's a summary of your academic journey."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <StatsCard
                    title="Courses Enrolled"
                    value={courses.length.toString()}
                    icon={BookOpen}
                    description="The number of courses you are currently taking."
                />
                <StatsCard
                    title="Overall Score"
                    value="82%"
                    icon={Target}
                    description="+5% from last month"
                />
                <StatsCard
                    title="Worksheets Completed"
                    value="12"
                    icon={CheckCircle}
                    description="Keep up the great work!"
                />
            </div>

            <div className="flex justify-between items-center mb-4">
                 <h2 className="font-headline text-2xl font-bold tracking-tight">My Courses</h2>
                 <Button variant="ghost" asChild>
                     <Link href="/courses">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
                 </Button>
            </div>
           
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
        </div>
    )
}
