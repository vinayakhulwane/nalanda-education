'use client';
import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Worksheet } from "@/types";
import { Loader2 } from "lucide-react";
import { WorksheetDisplayCard } from "./worksheet-display-card";

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

  return (
    <div className="mt-6">
        {visibleWorksheets && visibleWorksheets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleWorksheets.map(ws => (
                    <WorksheetDisplayCard key={ws.id} worksheet={ws} />
                ))}
            </div>
        ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No worksheets available for this subject yet.</p>
            </div>
        )}
    </div>
  );
}
