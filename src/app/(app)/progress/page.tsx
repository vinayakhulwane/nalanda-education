'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { Subject, Class } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';

export default function ProgressPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // 1. Fetch subjects the user is enrolled in
  const enrolledSubjectsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.enrollments || userProfile.enrollments.length === 0) {
      return null;
    }
    return query(collection(firestore, 'subjects'), where(documentId(), 'in', userProfile.enrollments.slice(0, 30)));
  }, [firestore, userProfile?.enrollments]);
  const { data: enrolledSubjects, isLoading: subjectsLoading } = useCollection<Subject>(enrolledSubjectsQuery);

  // 2. Get unique class IDs from those subjects
  const enrolledClassIds = useMemo(() => {
    if (!enrolledSubjects) return [];
    const classIds = new Set(enrolledSubjects.map(s => s.classId));
    return Array.from(classIds);
  }, [enrolledSubjects]);

  // 3. Fetch the actual class documents based on the unique IDs
  const classesQuery = useMemoFirebase(() => {
    if (!firestore || enrolledClassIds.length === 0) return null;
    return query(collection(firestore, 'classes'), where(documentId(), 'in', enrolledClassIds.slice(0, 30)));
  }, [firestore, enrolledClassIds]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const isLoading = isUserProfileLoading || subjectsLoading || classesLoading;

  return (
    <div>
      <PageHeader
        title="My Progress"
        description="Select a class to view your progress in its subjects."
      />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {classes && classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((classItem) => (
                <Card key={classItem.id}>
                    <CardHeader>
                        <CardTitle>{classItem.name}</CardTitle>
                        <CardDescription>{classItem.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => router.push(`/progress/${classItem.id}`)}>
                            View Progress
                        </Button>
                    </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">You are not enrolled in any classes yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
