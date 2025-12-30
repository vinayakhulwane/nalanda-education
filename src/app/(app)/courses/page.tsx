'use client';

import { EnrolledSubjectCard } from "@/components/enrolled-subject-card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, documentId } from "firebase/firestore";
import type { Subject } from "@/types";
import { useMemo } from "react";
import { Loader2, BookOpen, Search, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CoursesPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const firestore = useFirestore();

  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.enrollments || userProfile.enrollments.length === 0) {
      return null;
    }
    // Firestore 'in' queries are limited to 30 items.
    return query(collection(firestore, 'subjects'), where(documentId(), 'in', userProfile.enrollments.slice(0, 30)));
  }, [firestore, userProfile?.enrollments]);

  const { data: enrolledSubjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);

  const isLoading = isUserProfileLoading || areSubjectsLoading;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      
      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 p-12 opacity-10">
                <Library className="h-64 w-64 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20" />
            
            <div className="container mx-auto px-6 py-12 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                        <BookOpen className="h-6 w-6 text-blue-200" />
                    </div>
                    <span className="font-semibold text-blue-200 tracking-wide uppercase text-sm">My Learning Path</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">My Courses</h1>
                <p className="text-lg text-slate-300 max-w-2xl">
                    Access all your enrolled subjects, track your progress, and continue learning where you left off.
                </p>
            </div>
      </div>

      {/* CONTENT GRID */}
      <div className="container mx-auto px-6 max-w-7xl">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading your courses...</p>
            </div>
        ) : (
            <>
            {enrolledSubjects && enrolledSubjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {enrolledSubjects.map((subject) => (
                        <EnrolledSubjectCard key={subject.id} subject={subject} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 p-8">
                    <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                        <Search className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No Courses Yet</h3>
                    <p className="text-muted-foreground max-w-md mb-8">
                        You haven't enrolled in any subjects yet. Explore the dashboard to find classes that interest you.
                    </p>
                    <Link href="/dashboard">
                        <Button size="lg" className="font-semibold shadow-lg hover:shadow-primary/25 transition-all">
                            Explore Subjects
                        </Button>
                    </Link>
                </div>
            )}
            </>
        )}
      </div>
    </div>
  );
}