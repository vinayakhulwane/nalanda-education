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
        // ✅ Fix: Added max-w-full and overflow handling for mobile fit
        <Card className="w-full max-w-[100vw] overflow-hidden border-0 shadow-none md:border md:shadow-sm">
            {/* ✅ Fix: Reduced padding on mobile (p-3) vs desktop (p-6) */}
            <CardHeader className="p-3 pb-0 md:p-6 md:pb-2">
                <CardTitle className="text-lg md:text-2xl">Worksheet Attempt History</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                    A log of all worksheets this student has completed.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
                {isLoading ? (
                    <div className="flex h-24 md:h-48 items-center justify-center">
                        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : orderedWorksheets.length > 0 ? (
                    // ✅ Fix: Tighter spacing (space-y-2) and scaled down text/content on mobile
                    <div className="space-y-2 md:space-y-4">
                        {orderedWorksheets.map(ws => {
                            const latestAttempt = attemptsByWorksheet.get(ws.id)?.[0];
                            return (
                                <div key={ws.id} className="origin-left transform scale-95 md:scale-100 w-full">
                                    <WorksheetDisplayCard
                                        worksheet={ws}
                                        view="list"
                                        attempt={latestAttempt}
                                        from="progress"
                                        studentId={student.id}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-6 md:py-10 text-sm md:text-base">
                        This student has not attempted any worksheets yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}