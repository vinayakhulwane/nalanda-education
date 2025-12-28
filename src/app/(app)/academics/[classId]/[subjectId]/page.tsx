'use client';

import { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, MoreVertical, Edit, Eye, EyeOff, Trash, Pencil, ShieldAlert, UserMinus, UserPlus, BookCopy, FilePlus, Lock, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
// ✅ Switched to standard functions for Modal safety
import { arrayRemove, arrayUnion, collection, doc, updateDoc, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import type { Subject, CustomTab, CurrencyType } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { RichTextEditor } from "@/components/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UnlockContentCard } from "@/components/academics/unlock-content-card";

// Dynamic Imports
const SyllabusEditor = dynamic(
  () => import('@/components/academics/syllabus-editor'), 
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const PracticeZone = dynamic(
  () => import('@/components/academics/practice-zone'),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const Leaderboard = dynamic(
  () => import('@/components/academics/leaderboard'),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);

const WorksheetList = dynamic(
  () => import('@/components/academics/worksheet-list').then(mod => mod.WorksheetList),
  { loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> }
);


function SubjectWorkspacePageContent({ classId, subjectId }: { classId: string, subjectId: string }) {
    const { user, userProfile, isUserProfileLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // ✅ Added Global Saving State
    
    // Custom Tab Dialog States
    const [isAddTabDialogOpen, setAddTabDialogOpen] = useState(false);
    const [isEditTabDialogOpen, setEditTabDialogOpen] = useState(false);
    const [isEditTabContentDialogOpen, setEditTabContentDialogOpen] = useState(false);
    const [isDeleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false);

    const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
    const [newTabName, setNewTabName] = useState("");
    const [editedTabName, setEditedTabName] = useState("");
    const [editedTabContent, setEditedTabContent] = useState("");
    const [tabCost, setTabCost] = useState(0);
    const [tabCurrency, setTabCurrency] = useState<CurrencyType>('coin');
    const [deletingTab, setDeletingTab] = useState<CustomTab | null>(null);

    const subjectDocRef = useMemoFirebase(() => firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null, [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
    
    const isEnrolled = useMemo(() => {
        return userProfile?.enrollments?.includes(subjectId) ?? false;
    }, [userProfile, subjectId]);
    
    const isUserBlocked = useMemo(() => {
        return userProfile?.active === false;
    }, [userProfile]);

    useEffect(() => {
        if (!isUserProfileLoading && !userProfile) {
            router.push('/dashboard');
        }
    }, [userProfile, isUserProfileLoading, router]);

    // ✅ FIXED: Async Handler
    const handleAddCustomTab = async () => {
        if (!firestore || !newTabName.trim() || !subjectId) return;
        setIsSaving(true);

        try {
            const newTab: CustomTab = {
                id: uuidv4(),
                label: newTabName,
                content: `Content for ${newTabName} goes here. Edit me!`,
                cost: tabCost > 0 ? tabCost : 0, 
                currency: tabCurrency || 'coin',
            };

            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, {
                customTabs: arrayUnion(newTab)
            });

            setNewTabName('');
            setTabCost(0);
            setTabCurrency('coin');
            setAddTabDialogOpen(false);
            toast({ title: "Success", description: "Tab created successfully." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to create tab." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const openEditTabDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabName(tab.label);
        setTabCost(tab.cost || 0);
        setTabCurrency(tab.currency || 'coin');
        setEditTabDialogOpen(true);
    };

    // ✅ FIXED: Async Handler
    const handleEditCustomTab = async () => {
        if (!firestore || !editedTabName.trim() || !subject || !editingTab) return;
        setIsSaving(true);

        try {
            const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {
                ...t, 
                label: editedTabName,
                cost: tabCost > 0 ? tabCost : 0, 
                currency: tabCurrency || 'coin',
            } : t);
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: updatedTabs });
            setEditTabDialogOpen(false);
            setEditingTab(null);
            toast({ title: "Saved", description: "Tab updated successfully." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update tab." });
        } finally {
            setIsSaving(false);
        }
    }

    const openDeleteTabDialog = (tab: CustomTab) => {
        setDeletingTab(tab);
        setDeleteTabDialogOpen(true);
    };
    
    // ✅ FIXED: Async Handler
    const handleDeleteCustomTab = async () => {
        if (!firestore || !deletingTab || !subject) return;
        setIsSaving(true);
        try {
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: arrayRemove(deletingTab) });
            setDeleteTabDialogOpen(false);
            setDeletingTab(null);
            toast({ title: "Deleted", description: "Tab removed." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete tab." });
        } finally {
            setIsSaving(false);
        }
    }

    const handleToggleTabVisibility = async (tab: CustomTab) => {
        if (!firestore || !subject) return;
        const updatedTabs = subject.customTabs?.map(t => t.id === tab.id ? {...t, hidden: !t.hidden} : t);
        const subjectRef = doc(firestore, 'subjects', subjectId);
        await updateDoc(subjectRef, { customTabs: updatedTabs });
    }

    const openEditTabContentDialog = (tab: CustomTab) => {
        setEditingTab(tab);
        setEditedTabContent(tab.content);
        setEditTabContentDialogOpen(true);
    }

    // ✅ FIXED: Async Handler
    const handleEditTabContent = async () => {
        if (!firestore || !subject || !editingTab) return;
        setIsSaving(true);
        try {
            const updatedTabs = subject.customTabs?.map(t => t.id === editingTab.id ? {...t, content: editedTabContent} : t);
            const subjectRef = doc(firestore, 'subjects', subjectId);
            await updateDoc(subjectRef, { customTabs: updatedTabs });
            setEditTabContentDialogOpen(false);
            setEditingTab(null);
            toast({ title: "Saved", description: "Content updated." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save content." });
        } finally {
            setIsSaving(false);
        }
    }

    const handleEnrollment = async () => {
        if (!firestore || !user || isUserBlocked) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            if (isEnrolled) {
                await updateDoc(userDocRef, { enrollments: arrayRemove(subjectId) });
                toast({ title: "Unenrolled", description: "You have left this subject." });
            } else {
                await updateDoc(userDocRef, { enrollments: arrayUnion(subjectId) });
                toast({ title: "Enrolled!", description: "Welcome to the class." });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Enrollment failed." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleUnlockTab = async (unlockingTab: CustomTab) => {
        if (!user || !userProfile || !firestore || !unlockingTab) return;
        const { cost, currency, id: tabId, label } = unlockingTab;
        if (!cost || !currency) return;
        
        const fieldMap: Record<string, string> = {
            coin: 'coins',
            gold: 'gold',
            diamond: 'diamonds',
            spark: 'coins' 
        };
        const balanceField = fieldMap[currency] || 'coins';
        const currentBalance = (userProfile as any)[balanceField] || 0;

        if (currentBalance < cost) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You need ${cost} ${currency} to unlock this tab.` });
            return;
        }

        setIsSaving(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            const transactionRef = doc(collection(firestore, 'transactions'));
            const batch = writeBatch(firestore);
            
            batch.update(userRef, {
                [balanceField]: increment(-cost),
                unlockedTabs: arrayUnion(tabId)
            });
            
            batch.set(transactionRef, {
                userId: user.uid,
                type: 'spent',
                description: `Unlocked tab: ${label}`,
                amount: cost,
                currency: currency,
                createdAt: serverTimestamp(),
            });
            
            await batch.commit();
            toast({ title: 'Tab Unlocked!', description: `You can now view the content of "${label}".` });
        } catch (error) {
            console.error("Error unlocking tab:", error);
            toast({ variant: 'destructive', title: 'Unlock Failed', description: 'Could not complete the transaction.' });
        } finally {
            setIsSaving(false);
        }
    };

    const description = subject?.description || "Manage the subject curriculum.";
    const shouldTruncate = description.length > 150;
    const displayedDescription = shouldTruncate && !isDescriptionExpanded ? `${description.substring(0, 150)}...` : description;

    const userIsEditor = userProfile?.role === 'admin' || userProfile?.role === 'teacher';
    
    const isTabUnlocked = (tab: CustomTab) => {
        if (!tab.cost || tab.cost <= 0) return true; // Free tabs are always unlocked
        return userProfile?.unlockedTabs?.includes(tab.id) ?? false;
    }
    
    const visibleCustomTabs = userIsEditor ? subject?.customTabs : subject?.customTabs?.filter(t => !t.hidden);

    if (isUserProfileLoading || isSubjectLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
             <Button variant="ghost" onClick={() => router.push(`/academics/${classId}`)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subjects
            </Button>
            <div className="border-b pb-4 mb-6">
                <div>
                    <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">{subject?.name || "Subject"}</h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        {displayedDescription}
                        {shouldTruncate && (
                             <Button variant="link" className="p-0 pl-1 text-lg" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                                {isDescriptionExpanded ? 'Read less' : 'Read more'}
                            </Button>
                        )}
                    </p>
                </div>
                 {userProfile?.role === 'student' && (
                    <div className="mt-4">
                        <Button onClick={handleEnrollment} disabled={isUserBlocked || isSaving}>
                           {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           {isUserBlocked ? (
                                <>
                                    <ShieldAlert className="mr-2" /> Blocked
                                </>
                           ) : isEnrolled ? (
                                <>
                                    <UserMinus className="mr-2" /> Unenroll
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2" /> Enroll
                                </>
                            )}
                        </Button>
                         {isUserBlocked && (
                            <Alert variant="destructive" className="mt-4 max-w-md">
                                <AlertTitle>Account Blocked</AlertTitle>
                                <AlertDescription>
                                    Your account has been blocked by an administrator. Please contact Nalanda Education to resolve this issue.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
            </div>
            
            {!isUserBlocked && (
            <Tabs defaultValue="syllabus">
                <div className="flex items-center">
                    <TabsList>
                        <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
                        <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
                        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                        {visibleCustomTabs?.map(tab => {
                            const isLocked = !userIsEditor && !isTabUnlocked(tab);
                            return (
                                <div key={tab.id} className="relative group">
                                    <TabsTrigger 
                                        value={tab.id} 
                                        className={userIsEditor ? 'pr-8' : isLocked ? 'pr-2' : ''}
                                    >
                                        {tab.label}
                                        {isLocked && <Lock className="ml-2 h-3 w-3 text-muted-foreground" />}
                                    </TabsTrigger>
                                    {userIsEditor && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute top-1/2 right-0.5 -translate-y-1/2 h-6 w-6 opacity-60 group-hover:opacity-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditTabDialog(tab)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleTabVisibility(tab)}>
                                                    {tab.hidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                                    {tab.hidden ? 'Show to Students' : 'Hide from Students'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openDeleteTabDialog(tab)} className="text-destructive focus:text-destructive">
                                                    <Trash className="mr-2 h-4 w-4" /> Delete Tab
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )
                        })}
                    </TabsList>
                    {userIsEditor && (
                         <Button variant="ghost" size="icon" className="ml-2" onClick={() => { setNewTabName(''); setTabCost(0); setAddTabDialogOpen(true);}}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                
                {/* DYNAMICALLY LOADED COMPONENTS */}
                <TabsContent value="syllabus">
                    <SyllabusEditor subjectId={subjectId} subjectName={subject?.name || 'this subject'}/>
                </TabsContent>

                <TabsContent value="worksheet">
                    <Tabs defaultValue="assignments" className="mt-4">
                        <TabsList>
                            <TabsTrigger value="assignments"><BookCopy className="mr-2 h-4 w-4"/> Classroom Assignments</TabsTrigger>
                            <TabsTrigger value="practice"><FilePlus className="mr-2 h-4 w-4"/> My Practice Zone</TabsTrigger>
                        </TabsList>
                        <TabsContent value="assignments">
                            <WorksheetList subjectId={subjectId} isEnrolled={isEnrolled} userIsEditor={userIsEditor} />
                        </TabsContent>
                        <TabsContent value="practice">
                            <PracticeZone classId={classId} subjectId={subjectId} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                
                <TabsContent value="leaderboard">
                     <Leaderboard subjectId={subjectId} />
                </TabsContent>

                 {visibleCustomTabs?.map(tab => {
                    const isLocked = !userIsEditor && !isTabUnlocked(tab);
                    return (
                        <TabsContent key={tab.id} value={tab.id}>
                            {isLocked ? (
                                <UnlockContentCard tab={tab} onUnlock={() => handleUnlockTab(tab)} />
                            ) : (
                                <Card className="mt-6">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle>{tab.label}</CardTitle>
                                        {userIsEditor && (
                                            <Button variant="outline" size="sm" onClick={() => openEditTabContentDialog(tab)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit Content
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="prose dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: tab.content }}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>
            )}

            {/* Add/Edit Tab Dialog */}
            <Dialog open={isAddTabDialogOpen || isEditTabDialogOpen} onOpenChange={(open) => !open && !isSaving && (setAddTabDialogOpen(false), setEditTabDialogOpen(false))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditTabDialogOpen ? "Edit Tab Details" : "Add New Tab"}</DialogTitle>
                        <DialogDescription>{isEditTabDialogOpen ? `Update the details for '${editingTab?.label}'` : 'Create a new custom tab for this subject.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="tab-name">Tab Name</Label>
                          <Input id="tab-name" value={isEditTabDialogOpen ? editedTabName : newTabName} onChange={e => isEditTabDialogOpen ? setEditedTabName(e.target.value) : setNewTabName(e.target.value)} placeholder="e.g., PDF Notes" disabled={isSaving}/>
                        </div>
                         <div className="space-y-2">
                           <Label>Cost (Optional)</Label>
                           <div className="flex gap-2">
                             <Input id="tab-cost" type="number" placeholder="e.g. 50" value={tabCost || ''} onChange={e => setTabCost(Number(e.target.value))} className="w-1/2" disabled={isSaving}/>
                              <Select value={tabCurrency} onValueChange={(v: any) => setTabCurrency(v)} disabled={isSaving}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="coin">Coins</SelectItem>
                                  <SelectItem value="gold">Gold</SelectItem>
                                  <SelectItem value="diamond">Diamonds</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>
                         </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddTabDialogOpen(false); setEditTabDialogOpen(false); }} disabled={isSaving}>Cancel</Button>
                        <Button onClick={isEditTabDialogOpen ? handleEditCustomTab : handleAddCustomTab} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tab Content Dialog */}
             <Dialog open={isEditTabContentDialogOpen} onOpenChange={(open) => !open && !isSaving && setEditTabContentDialogOpen(false)}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Edit Content</DialogTitle>
                        <DialogDescription>Edit the content for the tab '{editingTab?.label}'.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <RichTextEditor value={editedTabContent} onChange={setEditedTabContent} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTabContentDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleEditTabContent} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Content
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


             {/* Delete Tab Dialog */}
            <AlertDialog open={isDeleteTabDialogOpen} onOpenChange={(open) => !open && !isSaving && setDeleteTabDialogOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tab '{deletingTab?.label}' and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTabDialogOpen(false)} disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCustomTab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Tab
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
        </div>
    );
}

export default function SubjectWorkspacePage({ 
  params 
}: { 
  params: Promise<{ classId: string; subjectId: string }> 
}) {
    const { classId, subjectId } = use(params);

    return <SubjectWorkspacePageContent classId={classId} subjectId={subjectId} />;
}