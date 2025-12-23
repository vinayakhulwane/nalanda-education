'use client';

import { EnrolledSubjectCard } from "@/components/enrolled-subject-card";
import { PageHeader } from "@/components/page-header";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Subject } from "@/types";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

export default function CoursesPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const firestore = useFirestore();

  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.enrollments || userProfile.enrollments.length === 0) {
      return null;
    }
    // Firestore 'in' queries are limited to 30 items.
    // For a production app with many enrollments, this would need pagination or a different data model.
    return query(collection(firestore, 'subjects'), where('id', 'in', userProfile.enrollments.slice(0, 30)));
  }, [firestore, userProfile?.enrollments]);

  const { data: enrolledSubjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);

  const isLoading = isUserProfileLoading || areSubjectsLoading;

  return (
    <div>
      <PageHeader
        title="My Courses"
        description="Here are all the subjects you are currently enrolled in."
      />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {enrolledSubjects && enrolledSubjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrolledSubjects.map((subject) => (
                <EnrolledSubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">You are not enrolled in any subjects yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
