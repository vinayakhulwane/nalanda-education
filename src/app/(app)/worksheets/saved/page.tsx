'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MoreHorizontal, Eye, Paperclip, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Worksheet } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

function SavedWorksheetsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const worksheetsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'worksheets'),
      where('authorId', '==', user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: allUserWorksheets, isLoading } = useCollection<Worksheet>(worksheetsQuery);

  const worksheets = useMemo(() => {
    if (!allUserWorksheets) return [];
    
    // 1. Filter by subjectId on the client
    const subjectWorksheets = allUserWorksheets.filter(ws => ws.subjectId === subjectId);
    
    // 2. Sort by createdAt on the client
    return subjectWorksheets.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA; // Descending order
    });
  }, [allUserWorksheets, subjectId]);

  const backUrl = subjectId && classId ? `/worksheets/${classId}/${subjectId}` : '/worksheets';

  const handleDeleteWorksheet = (worksheetId: string) => {
    if (!firestore) return;
    const worksheetRef = doc(firestore, 'worksheets', worksheetId);
    deleteDocumentNonBlocking(worksheetRef);
    toast({
      title: "Worksheet Deleted",
      description: "The worksheet has been successfully deleted.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <PageHeader
        title="Saved Worksheets"
        description="Manage your previously created assignments for this subject."
      />

      <Card className="mt-6">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : worksheets && worksheets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worksheets.map((ws) => (
                  <TableRow key={ws.id}>
                    <TableCell className="font-medium">{ws.title}</TableCell>
                    <TableCell>
                      <Badge variant={ws.worksheetType === 'classroom' ? 'default' : 'secondary'}>
                        {ws.worksheetType === 'classroom' ? 'Classroom' : 'Sample'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      <Badge variant="outline">{ws.mode}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{ws.questions?.length || 0}</TableCell>
                    <TableCell>
                      {ws.createdAt?.toDate ? format(ws.createdAt.toDate(), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Paperclip className="mr-2 h-4 w-4" /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWorksheet(ws.id)} 
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">You have no saved worksheets for this subject yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SavedWorksheetsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SavedWorksheetsPageContent />
    </Suspense>
  );
}
