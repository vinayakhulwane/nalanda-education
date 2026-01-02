

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save, Coins, ScrollText, Trophy, BrainCircuit, Gift, Target, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import type { EconomySettings, CurrencyType, CouponCondition } from '@/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

export default function EconomySettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<EconomySettings>>({
    coinToGold: 10,
    goldToDiamond: 10,
    costPerMark: 0.5,
    rewardPractice: 1.0,
    rewardClassroom: 0.5,
    rewardSpark: 0.5,
    solutionCost: 5,
    solutionCurrency: 'coin',
    welcomeAiCredits: 5,
    surpriseRewardAmount: 100,
    surpriseRewardCurrency: 'coin',
    nextCouponAvailableDate: new Date(),
    couponConditions: [],
  });

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [time, setTime] = useState('09:00');
  
  const [isSaving, setIsSaving] = useState(false);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'economy');
  }, [firestore]);

  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<EconomySettings>(settingsDocRef);
  
  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  useEffect(() => {
    if (remoteSettings) {
      const newSettings: Partial<EconomySettings> = { ...remoteSettings };
      if (remoteSettings.nextCouponAvailableDate && (remoteSettings.nextCouponAvailableDate as any).seconds) {
        const date = new Date((remoteSettings.nextCouponAvailableDate as any).seconds * 1000);
        newSettings.nextCouponAvailableDate = date;
        // Pre-fill dropdowns from loaded settings
        setYear(date.getFullYear().toString());
        setMonth((date.getMonth() + 1).toString());
        setDay(date.getDate().toString());
        setTime(format(date, 'HH:mm'));
      }
      setSettings(newSettings);
    }
  }, [remoteSettings]);

  const isLoading = isUserProfileLoading || areSettingsLoading;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentDay = today.getDate();
  
  const years = useMemo(() => Array.from({ length: 10 }, (_, i) => currentYear + i), [currentYear]);
    
  const availableMonths = useMemo(() => {
      if (!year) { 
        const allMonths = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
        if (currentYear.toString() === year) return allMonths.slice(currentMonth -1)
        return allMonths
      };
      const allMonths = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
      if (parseInt(year) === currentYear) {
          return allMonths.slice(currentMonth - 1);
      }
      return allMonths;
  }, [year, currentYear, currentMonth]);

  const daysInMonth = useMemo(() => {
      if (!month || !year) return 31;
      return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, [month, year]);

  const availableDays = useMemo(() => {
      if (!month || !year) return Array.from({ length: daysInMonth }, (_, i) => i + 1);
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
          return days.filter(d => d >= currentDay);
      }
      return days;
  }, [daysInMonth, year, month, currentYear, currentMonth, currentDay]);
  
  const handleSaveExchangeRates = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    const payload = {
        coinToGold: settings.coinToGold || 0,
        goldToDiamond: settings.goldToDiamond || 0,
    };
    await setDocumentNonBlocking(settingsDocRef, payload, { merge: true });
    toast({ title: 'Settings Saved', description: `Exchange Rate settings have been updated.` });
    setIsSaving(false);
  };

  const handleSaveContentCosts = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    const payload = {
        costPerMark: settings.costPerMark || 0,
        solutionCost: settings.solutionCost || 0,
        solutionCurrency: settings.solutionCurrency || 'coin',
    };
    await setDocumentNonBlocking(settingsDocRef, payload, { merge: true });
    toast({ title: 'Settings Saved', description: `Content Cost settings have been updated.` });
    setIsSaving(false);
  };
  
  const handleSaveRewardRules = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    const payload = {
      rewardPractice: Number(settings.rewardPractice) || 0,
      rewardClassroom: Number(settings.rewardClassroom) || 0,
      rewardSpark: Number(settings.rewardSpark) || 0,
    };
    await setDocumentNonBlocking(settingsDocRef, payload, { merge: true });
    toast({ title: 'Settings Saved', description: `Reward Rule settings have been updated.` });
    setIsSaving(false);
  }

  const handleSaveCouponSettings = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    
    const payload: Partial<EconomySettings> = {
        welcomeAiCredits: Number(settings.welcomeAiCredits) || 0,
        surpriseRewardAmount: Number(settings.surpriseRewardAmount) || 0,
        surpriseRewardCurrency: settings.surpriseRewardCurrency || 'coin',
        couponConditions: settings.couponConditions || [],
    };

    if (year && month && day) {
        const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const [hours, minutes] = time.split(':').map(Number);
        newDate.setHours(hours, minutes, 0, 0);
        payload.nextCouponAvailableDate = newDate;
    }
    
    await setDocumentNonBlocking(settingsDocRef, payload, { merge: true });
    toast({ title: 'Settings Saved', description: `Coupon settings have been updated.` });
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return null;
  }

  const handleYearChange = (newYear: string) => {
      setYear(newYear);
      setMonth('');
      setDay('');
  }

  const handleMonthChange = (newMonth: string) => {
      setMonth(newMonth);
      setDay('');
  }

  const addCondition = () => {
    const newCondition: CouponCondition = { type: 'minClassroomAssignments', value: 1, description: '' };
    setSettings(prev => ({...prev, couponConditions: [...(prev.couponConditions || []), newCondition]}));
  }

  const removeCondition = (index: number) => {
      setSettings(prev => ({...prev, couponConditions: prev.couponConditions?.filter((_, i) => i !== index)}));
  }

  const updateCondition = (index: number, newCondition: Partial<CouponCondition>) => {
      setSettings(prev => {
          const newConditions = [...(prev.couponConditions || [])];
          newConditions[index] = { ...newConditions[index], ...newCondition };
          return {...prev, couponConditions: newConditions};
      });
  }


  return (
    <div>
      <PageHeader
        title="Economy Settings"
        description="Configure the virtual currency exchange rates, costs, and rewards for the entire application."
      />
      
      <div className="space-y-6 max-w-4xl mt-6">
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Global Impact Warning</AlertTitle>
          <AlertDescription>
            Changes made on this page are global and will affect all users immediately. Proceed with caution.
          </AlertDescription>
        </Alert>

        {/* SECTION 1: EXCHANGE RATES */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <CardTitle>Currency Exchange Rates</CardTitle>
            </div>
            <CardDescription>Define how much lower-tier currency is needed for higher-tier ones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="coinToGold">Coins required for 1 Gold</Label>
                <Input
                  id="coinToGold"
                  type="number"
                  value={settings.coinToGold || ''}
                  onChange={(e) => setSettings({ ...settings, coinToGold: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goldToDiamond">Gold required for 1 Diamond</Label>
                <Input
                  id="goldToDiamond"
                  type="number"
                  value={settings.goldToDiamond || ''}
                  onChange={(e) => setSettings({ ...settings, goldToDiamond: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 10"
                />
              </div>
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveExchangeRates} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Exchange Rates
            </Button>
          </CardFooter>
        </Card>

        {/* SECTION 2: CREATION & UNLOCK COSTS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              <CardTitle>Content Costs</CardTitle>
            </div>
            <CardDescription>Control how much students pay to build tests or unlock content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="costPerMark">Practice Test Cost Multiplier (per Mark)</Label>
                <div className="flex gap-4 items-center">
                  <Input 
                    id="costPerMark"
                    className="max-w-[150px]"
                    type="number" 
                    step="0.1"
                    value={settings.costPerMark ?? 0.5} 
                    onChange={(e) => setSettings({...settings, costPerMark: parseFloat(e.target.value)})} 
                  />
                  <span className="text-sm text-muted-foreground">
                      Example: <strong>0.5</strong>x cost.
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20">
                 <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-sm">AI Solution Unlock Cost</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cost Amount</Label>
                        <Input 
                            type="number" 
                            min="0"
                            value={settings.solutionCost ?? 5} 
                            onChange={(e) => setSettings({...settings, solutionCost: parseInt(e.target.value)})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Currency Type</Label>
                        <Select 
                            value={settings.solutionCurrency ?? 'coin'} 
                            onValueChange={(val: CurrencyType) => setSettings({...settings, solutionCurrency: val})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="coin">Coins</SelectItem>
                                <SelectItem value="gold">Gold</SelectItem>
                                <SelectItem value="diamond">Diamonds</SelectItem>
                                <SelectItem value="aiCredits">AI Credits</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    Students will pay this flat fee to view the AI-generated solution for any question.
                 </p>
              </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveContentCosts} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Content Costs
            </Button>
          </CardFooter>
        </Card>

        {/* SECTION 3: REWARD RULES */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <CardTitle>Core Reward Rules</CardTitle>
                </div>
                <CardDescription>Configure the multipliers for earning rewards from activities.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="rewardPractice">Practice Test Reward (Multiplier)</Label>
                        <Input 
                          id="rewardPractice"
                          type="number" step="0.1"
                          value={settings.rewardPractice ?? 1.0} 
                          onChange={(e) => setSettings({...settings, rewardPractice: parseFloat(e.target.value)})} 
                        />
                        <p className="text-xs text-muted-foreground">Default: 1.0 (100% Rewards)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rewardClassroom">Classroom Assignment Reward (Multiplier)</Label>
                        <Input 
                          id="rewardClassroom"
                          type="number" step="0.1"
                          value={settings.rewardClassroom ?? 0.5} 
                          onChange={(e) => setSettings({...settings, rewardClassroom: parseFloat(e.target.value)})} 
                        />
                        <p className="text-xs text-muted-foreground">Default: 0.5 (50% Rewards)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rewardSpark">Spark Conversion Rate</Label>
                        <Input 
                          id="rewardSpark"
                          type="number" step="0.1"
                          value={settings.rewardSpark ?? 0.5} 
                          onChange={(e) => setSettings({...settings, rewardSpark: parseFloat(e.target.value)})} 
                        />
                        <p className="text-xs text-muted-foreground">Rate at which Spark Marks convert to Coins.</p>
                      </div>
                </div>
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
                <Button onClick={handleSaveRewardRules} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Reward Rules
                </Button>
            </CardFooter>
        </Card>

        {/* SECTION 4 & 5: SURPRISE COUPON & ELIGIBILITY */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <CardTitle>Coupon Settings</CardTitle>
                </div>
                <CardDescription>Configure gifts, recurring rewards, and eligibility criteria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <h3 className="font-semibold text-sm">New User Welcome Gift</h3>
                     <div className="space-y-2">
                        <Label htmlFor="welcomeAiCredits">Welcome AI Credits Amount</Label>
                        <Input 
                            id="welcomeAiCredits"
                            type="number"
                            value={settings.welcomeAiCredits ?? 5} 
                            onChange={(e) => setSettings({...settings, welcomeAiCredits: parseInt(e.target.value)})} 
                        />
                        <p className="text-xs text-muted-foreground">
                            Amount of AI Credits given to a new user when they claim their first coupon.
                        </p>
                    </div>
                </div>

                 <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <h3 className="font-semibold text-sm">Recurring Surprise Reward</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Reward Amount</Label>
                            <Input 
                                type="number" 
                                value={settings.surpriseRewardAmount ?? 100} 
                                onChange={(e) => setSettings({...settings, surpriseRewardAmount: parseInt(e.target.value)})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reward Currency</Label>
                            <Select 
                                value={settings.surpriseRewardCurrency ?? 'coin'} 
                                onValueChange={(val: CurrencyType) => setSettings({...settings, surpriseRewardCurrency: val})}
                            >
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
                     <div className="space-y-2">
                        <Label htmlFor="cooldownHours">Next Coupon Availability Date & Time</Label>
                         <div className="flex flex-wrap gap-2">
                             <Select onValueChange={handleYearChange} value={year}>
                                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={handleMonthChange} value={month} disabled={!year}>
                                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Month" /></SelectTrigger>
                                <SelectContent>
                                    {availableMonths.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setDay} value={day} disabled={!month}>
                                <SelectTrigger className="w-[100px]"><SelectValue placeholder="Day" /></SelectTrigger>
                                <SelectContent>
                                    {availableDays.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                         <p className="text-xs text-muted-foreground">
                            Set the exact date and time the next coupon becomes available for all users.
                        </p>
                    </div>
                 </div>

                 <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4"/>Eligibility Conditions</h3>
                    <p className="text-xs text-muted-foreground -mt-2">Set optional criteria students must meet to claim the recurring coupon.</p>
                    
                    <div className="space-y-3">
                        {settings.couponConditions?.map((condition, index) => (
                            <div key={index} className="flex items-end gap-2 p-3 border rounded-lg bg-background">
                                <div className="flex-1 space-y-2">
                                    <Label>Condition Type</Label>
                                    <Select 
                                        value={condition.type}
                                        onValueChange={(type: CouponCondition['type']) => updateCondition(index, { type, value: 1 })}
                                    >
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
                                    <Input
                                        type="number"
                                        placeholder="Value"
                                        value={condition.value}
                                        onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) || 0 })}
                                        className="w-[120px]"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed" onClick={addCondition}>
                        <Plus className="h-4 w-4 mr-2" /> Add Condition
                    </Button>
                 </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button onClick={handleSaveCouponSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Coupon Settings
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
