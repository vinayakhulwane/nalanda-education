'use client';

import { useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, getDocs, orderBy, documentId } from "firebase/firestore";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { Loader2 } from "lucide-react";
import { EnrollmentPromptCard } from "./enrollment-prompt-card";
import { WorksheetDisplayCard } from "./worksheet-display-card";

interface WorksheetListProps {
  subjectId: string;
  isEnrolled: boolean;
  userIsEditor: boolean;
}

export function WorksheetList({ subjectId, isEnrolled, userIsEditor }: WorksheetListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [attempts, setAttempts] = useState<WorksheetAttempt[]>([]);
  const [areAttemptsLoading, setAttemptsLoading] = useState(true);

  // Get classroom worksheets
  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || !subjectId) return null;
    return query(
      collection(firestore, 'worksheets'),
      where('subjectId', '==', subjectId),
      where('worksheetType', '==', 'classroom')
    );
  }, [firestore, subjectId]);
  const { data: worksheets, isLoading: areWorksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

  // Fetch attempts for the current user for these worksheets
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!firestore || !user?.uid || !worksheets) {
        setAttemptsLoading(false);
        return;
      }
      const targetIds = worksheets.map(ws => ws.id);
      if (targetIds.length === 0) {
        setAttempts([]);
        setAttemptsLoading(false);
        return;
      }
      try {
        const attemptsQuery = query(
          collection(firestore, 'worksheet_attempts'),
          where('userId', '==', user.uid),
          where('worksheetId', 'in', targetIds.slice(0, 30)),
          orderBy('attemptedAt', 'desc')
        );
        const attemptSnapshots = await getDocs(attemptsQuery);
        const fetchedAttempts = attemptSnapshots.docs.map(d => ({ id: d.id, ...d.data() })) as WorksheetAttempt[];
        setAttempts(fetchedAttempts);
      } catch (error) {
        console.error("Error fetching attempts:", error);
      } finally {
        setAttemptsLoading(false);
      }
    };

    fetchAttempts();
  }, [firestore, user?.uid, worksheets]);

  const attemptsByWorksheet = useMemo(() => {
    const map = new Map<string, WorksheetAttempt[]>();
    attempts.forEach(attempt => {
      const existing = map.get(attempt.worksheetId) || [];
      map.set(attempt.worksheetId, [...existing, attempt]);
    });
    return map;
  }, [attempts]);

  const sortedWorksheets = useMemo(() => {
    if (!worksheets) return [];
    return [...worksheets].sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
  }, [worksheets]);


  if (!isEnrolled && !userIsEditor) {
    return <EnrollmentPromptCard />;
  }

  const isLoading = areWorksheetsLoading || areAttemptsLoading;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedWorksheets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedWorksheets.map((ws) => (
            <WorksheetDisplayCard
              key={ws.id}
              worksheet={ws}
              isPractice={false}
              view="list"
              attempts={attemptsByWorksheet.get(ws.id) || []}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-lg">
          No classroom assignments available yet.
        </div>
      )}
    </div>
  );
}
