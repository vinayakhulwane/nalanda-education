'use client';
import { useMemo } from 'react';
import type { User, Worksheet, WorksheetAttempt } from '@/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, documentId } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { WorksheetDisplayCard } from '../academics/worksheet-display-card';

interface StudentAttemptHistoryProps {
    student: User;
}

export function StudentAttemptHistory({ student }: StudentAttemptHistoryProps) {
    const firestore = useFirestore();
    const { userProfile } = useUser();
    const userIsAdminOrTeacher = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

    const attemptsQuery = useMemoFirebase(() => {
        // Only run the query if the current user is an admin/teacher OR if viewing own progress
        if (!firestore || !student.id || (!userIsAdminOrTeacher && student.id !== userProfile?.id)) {
            return null;
        }
        return query(
            collection(firestore, 'worksheet_attempts'),
            where('userId', '==', student.id),
            orderBy('attemptedAt', 'desc')
        );
    }, [firestore, student.id, userIsAdminOrTeacher, userProfile?.id]);

    const { data: attempts, isLoading: areAttemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);
    
    const worksheetIds = useMemo(() => {
        if (!attempts) return [];
        return [...new Set(attempts.map(a => a.worksheetId))];
    }, [attempts]);

    const worksheetsQuery = useMemoFirebase(() => {
        if (!firestore || worksheetIds.length === 0) return null;
        return query(collection(firestore, 'worksheets'), where(documentId(), 'in', worksheetIds.slice(0, 30)));
    }, [firestore, worksheetIds]);
    
    const { data: worksheets, isLoading: areWorksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

    const { attemptsByWorksheet, orderedWorksheets } = useMemo(() => {
        if (!attempts || !worksheets) return { attemptsByWorksheet: new Map(), orderedWorksheets: [] };

        const wsMap = new Map(worksheets.map(ws => [ws.id, ws]));
        const attemptsMap = new Map<string, WorksheetAttempt[]>();

        attempts.forEach(attempt => {
            const existing = attemptsMap.get(attempt.worksheetId) || [];
            attemptsMap.set(attempt.worksheetId, [...existing, attempt]);
        });

        const sortedWs = [...worksheets].sort((a, b) => {
            const lastAttemptA = attemptsMap.get(a.id)?.[0]?.attemptedAt?.toMillis() || 0;
            const lastAttemptB = attemptsMap.get(b.id)?.[0]?.attemptedAt?.toMillis() || 0;
            return lastAttemptB - lastAttemptA;
        });

        return { attemptsByWorksheet: attemptsMap, orderedWorksheets: sortedWs };
    }, [attempts, worksheets]);
    
    const isLoading = areAttemptsLoading || areWorksheetsLoading;

    // Do not render the component for non-admins if they are trying to view another student's history
    if (!userIsAdminOrTeacher && student.id !== userProfile?.id) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Worksheet Attempt History</CardTitle>
                <CardDescription>A log of all worksheets this student has completed.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : orderedWorksheets.length > 0 ? (
                    <div className="space-y-4">
                        {orderedWorksheets.map(ws => {
                            const latestAttempt = attemptsByWorksheet.get(ws.id)?.[0];
                            return (
                                <WorksheetDisplayCard
                                    key={ws.id}
                                    worksheet={ws}
                                    view="list"
                                    attempt={latestAttempt}
                                    from="progress"
                                />
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        This student has not attempted any worksheets yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
