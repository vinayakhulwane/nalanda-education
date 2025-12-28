'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, documentId, orderBy } from "firebase/firestore";
import type { Worksheet, WorksheetAttempt } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { WorksheetDisplayCard } from "@/components/academics/worksheet-display-card";

export default function PracticeZone({ classId, subjectId }: { classId: string, subjectId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, userProfile } = useUser();
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // 1. Fetch ALL attempts by the user to build the history
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        // This is a broad query, for performance at scale, you might add `subjectId` to attempts
        return query(
            collection(firestore, 'worksheet_attempts'),
            where('userId', '==', user.uid),
            orderBy('attemptedAt', 'desc')
        );
    }, [firestore, user]);
    const { data: allAttempts, isLoading: areAttemptsLoading } = useCollection<WorksheetAttempt>(attemptsQuery);
    
    // 2. From all attempts, get the unique IDs of all worksheets ever attempted by the user
    const allAttemptedWorksheetIds = useMemo(() => {
        if (!allAttempts) return [];
        return [...new Set(allAttempts.map(a => a.worksheetId))];
    }, [allAttempts]);

    // 3. Fetch all practice worksheets for this subject authored by the user
    const userCreatedWorksheetsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !subjectId) return null;
        return query(
            collection(firestore, 'worksheets'),
            where('subjectId', '==', subjectId),
            where('worksheetType', '==', 'practice'),
            where('authorId', '==', user.uid)
        );
    }, [firestore, user, subjectId]);
    const { data: userCreatedWorksheets, isLoading: areUserCreatedLoading } = useCollection<Worksheet>(userCreatedWorksheetsQuery);

    // 4. From the attempted worksheet IDs, fetch only the ones that match the current subject.
    // This gives us our "completed" list.
    const completedWorksheetsQuery = useMemoFirebase(() => {
        if (!firestore || allAttemptedWorksheetIds.length === 0) return null;
        return query(
            collection(firestore, 'worksheets'),
            where(documentId(), 'in', allAttemptedWorksheetIds.slice(0, 30)),
            where('subjectId', '==', subjectId)
        );
    }, [firestore, allAttemptedWorksheetIds, subjectId]);
    const { data: completedWorksheets, isLoading: areCompletedWorksheetsLoading } = useCollection<Worksheet>(completedWorksheetsQuery);
    
    // --- Data Processing ---
    const { notCompleted, attemptsMap, totalPages, paginatedCompleted } = useMemo(() => {
        if (!userCreatedWorksheets || !completedWorksheets || !allAttempts) {
            return { notCompleted: [], attemptsMap: new Map(), totalPages: 1, paginatedCompleted: [] };
        }

        // The "To-Do" list is user-created worksheets MINUS the ones that are in the completed list.
        const completedIds = new Set(completedWorksheets.map(ws => ws.id));
        const notCompletedWorksheets = userCreatedWorksheets.filter(ws => !completedIds.has(ws.id));
        
        // Map attempts to their worksheet ID for easy lookup
        const latestAttemptsMap = new Map<string, WorksheetAttempt>();
        allAttempts.forEach(attempt => {
            // Only consider attempts for worksheets of the current subject.
            if(completedWorksheets.some(ws => ws.id === attempt.worksheetId)) {
                const existing = latestAttemptsMap.get(attempt.worksheetId);
                // Store only the most recent attempt for each worksheet
                if (!existing || (attempt.attemptedAt && existing.attemptedAt && attempt.attemptedAt.toMillis() > existing.attemptedAt.toMillis())) {
                    latestAttemptsMap.set(attempt.worksheetId, attempt);
                }
            }
        });
        
        // Sort completed worksheets by the date of their latest attempt for chronological history
        const sortedCompleted = [...completedWorksheets].sort((a, b) => {
            const timeA = latestAttemptsMap.get(a.id)?.attemptedAt?.toMillis() || 0;
            const timeB = latestAttemptsMap.get(b.id)?.attemptedAt?.toMillis() || 0;
            return timeB - timeA;
        });

        const totalP = Math.ceil(sortedCompleted.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = sortedCompleted.slice(startIndex, endIndex);

        return { 
            notCompleted: notCompletedWorksheets, 
            attemptsMap: latestAttemptsMap,
            totalPages: totalP,
            paginatedCompleted: paginatedItems,
        };
    }, [userCreatedWorksheets, completedWorksheets, allAttempts, currentPage, itemsPerPage]);
    
    const isLoading = areUserCreatedLoading || areCompletedWorksheetsLoading || areAttemptsLoading;
    const createWorksheetUrl = `/worksheets/new?classId=${classId}&subjectId=${subjectId}&source=practice`;
    
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>My Practice Zone</CardTitle>
                <CardDescription>Create your own worksheets, view saved ones, and check your attempt history.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="saved">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="saved">Saved & To-Do</TabsTrigger>
                        <TabsTrigger value="history">Attempt History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="saved">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                            <Card 
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => router.push(createWorksheetUrl)}
                            >
                                <div className="flex flex-col items-center text-center">
                                    <Plus className="h-10 w-10 text-muted-foreground mb-4"/>
                                    <h3 className="font-semibold">Create New Worksheet</h3>
                                    <p className="text-sm text-muted-foreground">Build a worksheet tailored to your needs.</p>
                                </div>
                            </Card>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48 col-span-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                notCompleted.map(ws => (
                                    <WorksheetDisplayCard 
                                        key={ws.id} 
                                        worksheet={ws} 
                                        isPractice={true}
                                        view="card"
                                    />
                                ))
                            )}
                        </div>
                        {notCompleted.length === 0 && !isLoading && (
                            <div className="text-center text-muted-foreground py-10 mt-4">
                                <p>Your saved practice worksheets will appear here.</p>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="history">
                         <div className="space-y-4 mt-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48 col-span-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : paginatedCompleted.length > 0 ? (
                                paginatedCompleted.map(ws => (
                                    <WorksheetDisplayCard 
                                        key={ws.id} 
                                        worksheet={ws} 
                                        isPractice={true}
                                        view="list"
                                        attempt={attemptsMap.get(ws.id)}
                                    />
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-10 mt-4">
                                    <p>Your completed practice worksheets will appear here.</p>
                                </div>
                            )}
                        </div>
                        {completedWorksheets && completedWorksheets.length > 0 && !isLoading && totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                                        disabled={currentPage === totalPages}
                                    >
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
