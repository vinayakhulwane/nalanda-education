'use client';
import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Worksheet } from "@/types";
import { Loader2, SearchX } from "lucide-react";
import { WorksheetDisplayCard } from "./worksheet-display-card"; // Make sure to use the new file
import { EnrollmentPromptCard } from "./enrollment-prompt-card";

interface WorksheetListProps {
  subjectId: string;
  isEnrolled: boolean;
  userIsEditor: boolean;
}

export function WorksheetList({ subjectId, isEnrolled, userIsEditor }: WorksheetListProps) {
  const firestore = useFirestore();

  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || !subjectId) return null;
    return query(collection(firestore, 'worksheets'), where('subjectId', '==', subjectId));
  }, [firestore, subjectId]);

  const { data: worksheets, isLoading } = useCollection<Worksheet>(worksheetsQuery);

  const visibleWorksheets = useMemo(() => {
    if (!worksheets) return [];
    
    // Admins and teachers see all worksheets for the subject
    if (userIsEditor) {
        return worksheets;
    }
    
    // Students see all 'sample' worksheets, and 'classroom' worksheets ONLY if enrolled.
    return worksheets.filter(ws => {
      if (ws.worksheetType === 'sample') {
        return true;
      }
      if (ws.worksheetType === 'classroom' && isEnrolled) {
        return true;
      }
      return false;
    });
  }, [worksheets, isEnrolled, userIsEditor]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const showEnrollmentPrompt = !userIsEditor && !isEnrolled;

  return (
    <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {(visibleWorksheets && visibleWorksheets.length > 0) || showEnrollmentPrompt ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleWorksheets.map(ws => (
                    <WorksheetDisplayCard 
                        key={ws.id} 
                        worksheet={ws} 
                        isPractice={false}
                    />
                ))}
                 {showEnrollmentPrompt && <EnrollmentPromptCard />}
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