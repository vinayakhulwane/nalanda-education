'use client';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { Subject, Class } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Progress } from '@/components/ui/progress';

export default function ClassProgressPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  // 1. Fetch subjects for this class that the user is enrolled in
  const enrolledSubjectsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.enrollments || userProfile.enrollments.length === 0 || !classId) {
      return null;
    }
    return query(
        collection(firestore, 'subjects'), 
        where('classId', '==', classId),
        where(documentId(), 'in', userProfile.enrollments.slice(0, 30))
    );
  }, [firestore, userProfile?.enrollments, classId]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(enrolledSubjectsQuery);

  const isLoading = isUserProfileLoading || subjectsLoading;

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/progress')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to All Classes
      </Button>

      <PageHeader
        title="Subject Progress"
        description="Select a subject to see detailed analytics."
      />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {subjects && subjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subjects.map((subject) => (
                <Card key={subject.id}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <BookOpen className="h-5 w-5 text-primary" />
                            {subject.name}
                        </CardTitle>
                        <CardDescription>Progress overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Overall Score</span>
                                <span className="font-bold">N/A</span>
                            </div>
                            <Progress value={0} className="h-2" />
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button variant="secondary" className="w-full" onClick={() => alert('Detailed subject view coming soon!')}>
                            View Details
                        </Button>
                    </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">You are not enrolled in any subjects in this class.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
