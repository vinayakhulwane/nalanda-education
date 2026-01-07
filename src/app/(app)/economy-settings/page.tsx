'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save, Coins, ScrollText, Trophy, BrainCircuit, Gift, Target, Plus, X, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import type { EconomySettings, CurrencyType, CouponCondition, Coupon } from '@/types';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';

// Reusable Coupon Form Component
function CouponForm({ coupon, setCoupon, availableYears, availableMonths, availableDays }: any) {
  const [isScheduled, setIsScheduled] = useState(!!coupon.availableDate);
  const [day, setDay] = useState(coupon.availableDate ? new Date(coupon.availableDate).getDate().toString() : '');
  const [month, setMonth] = useState(coupon.availableDate ? (new Date(coupon.availableDate).getMonth() + 1).toString() : '');
  const [year, setYear] = useState(coupon.availableDate ? new Date(coupon.availableDate).getFullYear().toString() : '');
  const [time, setTime] = useState(coupon.availableDate ? format(new Date(coupon.availableDate), 'HH:mm') : '09:00');

  useEffect(() => {
    if (!isScheduled) {
      setCoupon({ ...coupon, availableDate: null });
      return;
    }

    if (year && month && day) {
      const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const [hours, minutes] = time.split(':').map(Number);
      newDate.setHours(hours, minutes, 0, 0);
      setCoupon({ ...coupon, availableDate: newDate });
    } else {
      // If scheduling is on but date is incomplete, ensure it's not null
      if (!coupon.availableDate) {
        setCoupon({ ...coupon, availableDate: new Date() });
      }
    }
  }, [year, month, day, time, isScheduled]);

  const handleYearChange = (newYear: string) => { setYear(newYear); setMonth(''); setDay(''); };
  const handleMonthChange = (newMonth: string) => { setMonth(newMonth); setDay(''); };

  const addCondition = () => {
    const newCondition: CouponCondition = { type: 'minClassroomAssignments', value: 1 };
    setCoupon({ ...coupon, conditions: [...(coupon.conditions || []), newCondition] });
  };

  const removeCondition = (index: number) => {
    setCoupon({ ...coupon, conditions: coupon.conditions?.filter((_: any, i: number) => i !== index) });
  };

  const updateCondition = (index: number, newCondition: Partial<CouponCondition>) => {
    const newConditions = [...(coupon.conditions || [])];
    newConditions[index] = { ...newConditions[index], ...newCondition };
    setCoupon({ ...coupon, conditions: newConditions });
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
      <div className="space-y-2">
        <Label>Coupon Name / Title</Label>
        <Input placeholder="e.g., 'Welcome Bonus', 'Mid-term Surprise'" value={coupon.name || ''} onChange={(e) => setCoupon({ ...coupon, name: e.target.value })} />
      </div>
      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
        <h3 className="font-semibold text-sm">Reward Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reward Amount</Label>
            <Input type="number" value={coupon.rewardAmount || ''} onChange={(e) => setCoupon({ ...coupon, rewardAmount: parseInt(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Reward Currency</Label>
            <Select value={coupon.rewardCurrency || 'coin'} onValueChange={(val: CurrencyType) => setCoupon({ ...coupon, rewardCurrency: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="coin">Coins</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamonds</SelectItem>
                <SelectItem value="aiCredits">AI Credits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Scheduling</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="scheduling-switch" className="text-xs text-muted-foreground">Set a Date</Label>
            <Switch id="scheduling-switch" checked={isScheduled} onCheckedChange={setIsScheduled} />
          </div>
        </div>
        {isScheduled && (
          <div className="flex flex-wrap gap-2 animate-in fade-in">
            <Select onValueChange={handleYearChange} value={year}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{availableYears.map((y: number) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={handleMonthChange} value={month} disabled={!year}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Month" /></SelectTrigger><SelectContent>{availableMonths.map((m: any) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={setDay} value={day} disabled={!month}><SelectTrigger className="w-[100px]"><SelectValue placeholder="Day" /></SelectTrigger><SelectContent>{availableDays.map((d: number) => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}</SelectContent></Select>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-auto" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{isScheduled ? 'Set the exact date and time the coupon becomes available.' : 'This coupon will be available immediately if conditions are met.'}</p>
      </div>
      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4" />Eligibility Conditions</h3>
        <p className="text-xs text-muted-foreground -mt-2">Set optional criteria students must meet to claim this coupon.</p>
        <div className="space-y-3">
          {coupon.conditions?.map((condition: CouponCondition, index: number) => (
            <div key={index} className="flex items-end gap-2 p-3 border rounded-lg bg-background">
              <div className="flex-1 space-y-2">
                <Label>Condition Type</Label>
                <Select value={condition.type} onValueChange={(type: CouponCondition['type']) => updateCondition(index, { type, value: 1 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minClassroomAssignments">Min. Classroom Assignments</SelectItem>
                    <SelectItem value="minPracticeAssignments">Min. Practice Assignments</SelectItem>
                    <SelectItem value="minGoldQuestions">Min. Gold Questions</SelectItem>
                    <SelectItem value="minAcademicHealth">Min. Academic Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" placeholder="Value" value={condition.value} onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) || 0 })} className="w-[120px]" />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(index)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full border-dashed" onClick={addCondition}><Plus className="h-4 w-4 mr-2" /> Add Condition</Button>
      </div>
    </div>
  );
}

export default function EconomySettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<EconomySettings>>({ coinToGold: 10, goldToDiamond: 10, costPerMark: 0.5, aiGradingCostMultiplier: 1, solutionCost: 5, solutionCurrency: 'coin' });
  const [isSaving, setIsSaving] = useState(false);

  // Coupon Management State
  const [isCouponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const couponsRef = useMemoFirebase(() => firestore ? collection(firestore, 'coupons') : null, [firestore]);
  const { data: coupons, isLoading: areCouponsLoading } = useCollection<Coupon>(couponsRef);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<EconomySettings>(settingsDocRef);

  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  useEffect(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings]);

  const isLoading = isUserProfileLoading || areSettingsLoading || areCouponsLoading;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const years = useMemo(() => Array.from({ length: 10 }, (_: any, i: number) => currentYear + i), [currentYear]);
  const availableMonths = useMemo(() => Array.from({ length: 12 }, (_: any, i: number) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) })), []);
  const availableDays = useMemo(() => Array.from({ length: 31 }, (_: any, i: number) => i + 1), []);

  const handleSaveSettings = async (payload: Partial<EconomySettings>, message: string) => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    await setDocumentNonBlocking(settingsDocRef, payload, { merge: true });
    toast({ title: 'Settings Saved', description: `${message} settings have been updated.` });
    setIsSaving(false);
  };

  const openCreateDialog = () => {
    setEditingCoupon({ id: uuidv4(), name: '', rewardAmount: 100, rewardCurrency: 'coin', conditions: [], availableDate: null });
    setCouponDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    const couponData = {
      ...coupon,
      availableDate: coupon.availableDate?.toDate ? coupon.availableDate.toDate() : null,
    };
    setEditingCoupon(couponData);
    setCouponDialogOpen(true);
  };

  const handleSaveCoupon = () => {
    if (!firestore || !editingCoupon) return;
    const isEditing = coupons?.some(c => c.id === editingCoupon.id);
    const payload = { ...editingCoupon, updatedAt: serverTimestamp() };

    if (isEditing) {
      setDocumentNonBlocking(doc(firestore, 'coupons', editingCoupon.id), payload, { merge: true });
    } else {
      addDocumentNonBlocking(collection(firestore, 'coupons'), { ...payload, createdAt: serverTimestamp() });
    }
    setCouponDialogOpen(false);
    setEditingCoupon(null);
    toast({ title: `Coupon ${isEditing ? 'Updated' : 'Created'}` });
  };

  const openDeleteDialog = (coupon: Coupon) => {
    setDeletingCoupon(coupon);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCoupon = () => {
    if (!firestore || !deletingCoupon) return;
    deleteDocumentNonBlocking(doc(firestore, 'coupons', deletingCoupon.id));
    setDeleteDialogOpen(false);
    setDeletingCoupon(null);
    toast({ title: 'Coupon Deleted' });
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Economy Settings" description="Configure currency exchange rates, costs, and rewards." />

      <div className="space-y-6 max-w-4xl mt-6">
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Global Impact Warning</AlertTitle><AlertDescription>Changes here affect all users immediately. Proceed with caution.</AlertDescription></Alert>
        <Card>
          <CardHeader><div className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /><CardTitle>Currency Exchange Rates</CardTitle></div><CardDescription>Define how much lower-tier currency is needed for higher-tier ones.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label htmlFor="coinToGold">Coins required for 1 Gold</Label><Input id="coinToGold" type="number" value={settings.coinToGold || ''} onChange={(e) => setSettings({ ...settings, coinToGold: parseFloat(e.target.value) || 0 })} placeholder="e.g., 10" /></div>
              <div className="space-y-2"><Label htmlFor="goldToDiamond">Gold required for 1 Diamond</Label><Input id="goldToDiamond" type="number" value={settings.goldToDiamond || ''} onChange={(e) => setSettings({ ...settings, goldToDiamond: parseFloat(e.target.value) || 0 })} placeholder="e.g., 10" /></div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4"><Button onClick={() => handleSaveSettings({ coinToGold: settings.coinToGold || 0, goldToDiamond: settings.goldToDiamond || 0 }, 'Exchange Rate')} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Exchange Rates</Button></CardFooter>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /><CardTitle>Content Costs</CardTitle></div><CardDescription>Control how much students pay to build tests or unlock content.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Label htmlFor="costPerMark">Practice Test Cost Multiplier (per Mark)</Label><div className="flex gap-4 items-center"><Input id="costPerMark" className="max-w-[150px]" type="number" step="0.1" value={settings.costPerMark ?? 0.5} onChange={(e) => setSettings({ ...settings, costPerMark: parseFloat(e.target.value) })} /><span className="text-sm text-muted-foreground">Example: <strong>0.5</strong>x cost.</span></div></div>
            <div className="space-y-2"><Label htmlFor="aiGradingCostMultiplier">AI Grading Cost (Multiplier)</Label><div className="flex gap-4 items-center"><Input id="aiGradingCostMultiplier" className="max-w-[150px]" type="number" step="0.5" value={settings.aiGradingCostMultiplier ?? 1} onChange={(e) => setSettings({ ...settings, aiGradingCostMultiplier: parseFloat(e.target.value) })} /><span className="text-sm text-muted-foreground">AI Credits per AI-graded question.</span></div></div>
            <div className="p-4 border rounded-lg bg-muted/20"><div className="flex items-center gap-2 mb-4"><BrainCircuit className="h-5 w-5 text-purple-600" /><h3 className="font-semibold text-sm">AI Solution Unlock Cost</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Cost Amount</Label><Input type="number" min="0" value={settings.solutionCost ?? 5} onChange={(e) => setSettings({ ...settings, solutionCost: parseInt(e.target.value) })} /></div><div className="space-y-2"><Label>Currency Type</Label><Select value={settings.solutionCurrency ?? 'coin'} onValueChange={(val: CurrencyType) => setSettings({ ...settings, solutionCurrency: val })}><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger><SelectContent><SelectItem value="coin">Coins</SelectItem><SelectItem value="gold">Gold</SelectItem><SelectItem value="diamond">Diamonds</SelectItem><SelectItem value="aiCredits">AI Credits</SelectItem></SelectContent></Select></div></div><p className="text-xs text-muted-foreground mt-2">Students will pay this flat fee to view the AI-generated solution for any question.</p></div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4"><Button onClick={() => handleSaveSettings({ costPerMark: settings.costPerMark || 0, aiGradingCostMultiplier: settings.aiGradingCostMultiplier || 0, solutionCost: settings.solutionCost || 0, solutionCurrency: settings.solutionCurrency || 'coin' }, 'Content Cost')} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Content Costs</Button></CardFooter>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /><CardTitle>Core Reward Rules</CardTitle></div><CardDescription>Configure multipliers for earning rewards.</CardDescription></CardHeader>
          <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div className="space-y-2"><Label htmlFor="rewardPractice">Practice Test Reward (Multiplier)</Label><Input id="rewardPractice" type="number" step="0.1" value={settings.rewardPractice ?? 1.0} onChange={(e) => setSettings({ ...settings, rewardPractice: parseFloat(e.target.value) })} /><p className="text-xs text-muted-foreground">Default: 1.0 (100% Rewards)</p></div><div className="space-y-2"><Label htmlFor="rewardClassroom">Classroom Assignment Reward (Multiplier)</Label><Input id="rewardClassroom" type="number" step="0.1" value={settings.rewardClassroom ?? 0.5} onChange={(e) => setSettings({ ...settings, rewardClassroom: parseFloat(e.target.value) })} /><p className="text-xs text-muted-foreground">Default: 0.5 (50% Rewards)</p></div><div className="space-y-2"><Label htmlFor="rewardSpark">Spark Conversion Rate</Label><Input id="rewardSpark" type="number" step="0.1" value={settings.rewardSpark ?? 0.5} onChange={(e) => setSettings({ ...settings, rewardSpark: parseFloat(e.target.value) })} /><p className="text-xs text-muted-foreground">Rate at which Spark Marks convert to Coins.</p></div></div></CardContent>
          <CardFooter className="border-t px-6 py-4"><Button onClick={() => handleSaveSettings({ rewardPractice: Number(settings.rewardPractice) || 0, rewardClassroom: Number(settings.rewardClassroom) || 0, rewardSpark: Number(settings.rewardSpark) || 0 }, 'Reward Rule')} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Reward Rules</Button></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /><CardTitle>Coupon Management</CardTitle></div>
              <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" /> Create Coupon</Button>
            </div>
            <CardDescription>Create and manage promotional coupons for students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coupons?.map(coupon => (
              <div key={coupon.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div>
                  <p className="font-semibold">{coupon.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Reward: {coupon.rewardAmount} {coupon.rewardCurrency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(coupon)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(coupon)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {coupons?.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No coupons created yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCouponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editingCoupon?.createdAt ? 'Edit' : 'Create'} Coupon</DialogTitle><DialogDescription>Define the reward, schedule, and conditions for this coupon.</DialogDescription></DialogHeader>
          {editingCoupon && <CouponForm coupon={editingCoupon} setCoupon={setEditingCoupon} availableYears={years} availableMonths={availableMonths} availableDays={availableDays} />}
          <DialogFooter><Button variant="outline" onClick={() => setCouponDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveCoupon}>Save Coupon</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the coupon "{deletingCoupon?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCoupon} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
