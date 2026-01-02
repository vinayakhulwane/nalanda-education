
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save, Coins, ScrollText, Trophy, BrainCircuit, Gift, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import type { EconomySettings, CurrencyType } from '@/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  });

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [time, setTime] = useState('09:00');

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'economy');
  }, [firestore]);

  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<EconomySettings>(settingsDocRef);

  useEffect(() => {
    if (remoteSettings) {
      const newSettings: Partial<EconomySettings> = { ...remoteSettings };
      if (remoteSettings.nextCouponAvailableDate && remoteSettings.nextCouponAvailableDate.seconds) {
        const date = new Date(remoteSettings.nextCouponAvailableDate.seconds * 1000);
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


  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  const isLoading = isUserProfileLoading || areSettingsLoading;
  
  // Date dropdown logic
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentDay = today.getDate();

  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
    
  const availableMonths = useMemo(() => {
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
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
          return days.filter(d => d >= currentDay);
      }
      return days;
  }, [daysInMonth, year, month, currentYear, currentMonth, currentDay]);

  // Combine local date/time into the main settings object before saving
  const handleSave = () => {
    if (!settingsDocRef) return;
    
    // Construct date from dropdowns and time
    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const [hours, minutes] = time.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);

    const settingsToSave = {
      ...settings,
      nextCouponAvailableDate: newDate,
    };
    
    setDocumentNonBlocking(settingsDocRef, settingsToSave, { merge: true });
    toast({
        title: 'Settings Saved',
        description: 'Economy settings have been updated globally.',
    });
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
        </Card>

        {/* SECTION 3: REWARD RULES */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>Reward Rules</CardTitle>
            </div>
            <CardDescription>Set the percentage of rewards students earn for different activities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </Card>

        {/* SECTION 4: SURPRISE COUPON */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <CardTitle>Surprise Coupon Settings</CardTitle>
                </div>
                <CardDescription>Configure the welcome gift and recurring surprise rewards for students.</CardDescription>
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
            </CardContent>
        </Card>

        <CardFooter className="px-0">
            <Button onClick={handleSave} size="lg" className="w-full md:w-auto">
              <Save className="mr-2" />
              Save All Settings
            </Button>
        </CardFooter>
      </div>
    </div>
  );
}
