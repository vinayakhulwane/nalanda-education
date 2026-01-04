'use client';

import { useMemo, useEffect, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { Loader2, SearchX } from "lucide-react";

// Absolute imports
import { WorksheetDisplayCard } from "@/components/academics/worksheet-display-card";
import { EnrollmentPromptCard } from "@/components/academics/enrollment-prompt-card";

interface WorksheetListProps {
  subjectId: string;
  isEnrolled: boolean;
  userIsEditor: boolean;
}

export function WorksheetList({ subjectId, isEnrolled, userIsEditor }: WorksheetListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  
  // State to store attempts mapped by worksheetId
  const [attemptsMap, setAttemptsMap] = useState<Record<string, WorksheetAttempt[]>>({});
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(true);

  // 1. Fetch Worksheets
  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || !subjectId) return null;
    return query(collection(firestore, 'worksheets'), where('subjectId', '==', subjectId));
  }, [firestore, subjectId]);

  const { data: worksheets, isLoading: isWorksheetsLoading } = useCollection<Worksheet>(worksheetsQuery);

  // 2. Filter Worksheets based on role
  const visibleWorksheets = useMemo(() => {
    if (!worksheets) return [];
    
    if (userIsEditor) {
        return worksheets;
    }
    
    return worksheets.filter(ws => {
      if (ws.worksheetType === 'sample') return true;
      if (ws.worksheetType === 'classroom' && isEnrolled) return true;
      return false;
    });
  }, [worksheets, isEnrolled, userIsEditor]);

  // 3. Fetch Attempts
  useEffect(() => {
    async function fetchAttempts() {
      if (!firestore || !user?.uid || !subjectId) {
        setIsAttemptsLoading(false);
        return;
      }

      try {
        const q = query(
            collection(firestore, 'worksheet_attempts'), 
            where('userId', '==', user.uid),
            where('subjectId', '==', subjectId)
        );
        
        const snapshot = await getDocs(q);
        const mapping: Record<string, WorksheetAttempt[]> = {};

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() } as WorksheetAttempt;
            if (!mapping[data.worksheetId]) {
                mapping[data.worksheetId] = [];
            }
            mapping[data.worksheetId].push(data);
        });

        // ✅ FIXED: Changed 'startedAt' to 'createdAt' and added safe access
        // This fixes the TypeScript error and handles missing timestamps gracefully.
        Object.keys(mapping).forEach(key => {
            mapping[key].sort((a, b) => {
                // @ts-ignore - Handle potential missing type definition safely
                const dateA = a.createdAt?.seconds || a.startedAt?.seconds || 0;
                // @ts-ignore
                const dateB = b.createdAt?.seconds || b.startedAt?.seconds || 0;
                return dateB - dateA;
            });
        });

        setAttemptsMap(mapping);
      } catch (error) {
        console.error("Error fetching attempts:", error);
      } finally {
        setIsAttemptsLoading(false);
      }
    }

    fetchAttempts();
  }, [firestore, user, subjectId]);

  const showEnrollmentPrompt = !userIsEditor && !isEnrolled;
  const isLoading = isWorksheetsLoading || isAttemptsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {(visibleWorksheets && visibleWorksheets.length > 0) || showEnrollmentPrompt ? (
            <div>
                {/* --- Mobile View: List --- */}
                <div className="block md:hidden space-y-4">
                    {visibleWorksheets.map(ws => (
                        <WorksheetDisplayCard 
                            key={ws.id} 
                            worksheet={ws} 
                            isPractice={false}
                            attempts={attemptsMap[ws.id] || []}
                            view="list"
                        />
                    ))}
                    {showEnrollmentPrompt && <EnrollmentPromptCard />}
                </div>

                {/* --- Desktop View: Grid --- */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visibleWorksheets.map(ws => (
                        <WorksheetDisplayCard 
                            key={ws.id} 
                            worksheet={ws} 
                            isPractice={false}
                            attempts={attemptsMap[ws.id] || []}
                            view="card"
                        />
                    ))}
                    {showEnrollmentPrompt && <EnrollmentPromptCard />}
                </div>
            </div>
        ) : (
            <div className="flex flex-col h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-full mb-3">
                     <SearchX className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">No assignments yet</p>
                <p className="text-sm text-muted-foreground">Check back later for new classroom work.</p>
            </div>
        )}
    </div>
  );
}