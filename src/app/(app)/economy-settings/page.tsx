'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save, Coins, ScrollText, Trophy, BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import type { EconomySettings } from '@/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/components/ui/use-toast';

export default function EconomySettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Updated state to include ALL settings (Exchange, Costs, Rewards)
  const [settings, setSettings] = useState<Partial<EconomySettings>>({
    coinToGold: 10,
    goldToDiamond: 10,
    costPerMark: 0.5,
    rewardPractice: 1.0,
    rewardClassroom: 0.5,
    rewardSpark: 0.5,
    solutionCostPercentage: 25, // New default value
  });

  // Updated path to match where your app likely stores global settings
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'economy'); // Keeping your existing path
  }, [firestore]);

  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<EconomySettings>(settingsDocRef);

  useEffect(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings]);

  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  const handleSave = () => {
    if (!settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, settings, { merge: true });
    toast({
        title: 'Settings Saved',
        description: 'Economy settings have been updated globally.',
    });
  };

  const isLoading = isUserProfileLoading || areSettingsLoading;

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

  return (
    <div>
      <PageHeader
        title="Economy Settings"
        description="Configure the virtual currency exchange rates, costs, and rewards for the entire application."
      />
      
      <div className="space-y-6 max-w-4xl mt-6">
        
        {/* Warning Alert */}
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
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
               <div className="space-y-2">
                <Label htmlFor="solutionCostPercentage">AI Solution Cost (% of Marks)</Label>
                <div className="flex gap-4 items-center">
                  <Input 
                    id="solutionCostPercentage"
                    className="max-w-[150px]"
                    type="number" 
                    step="1"
                    value={settings.solutionCostPercentage ?? 25} 
                    onChange={(e) => setSettings({...settings, solutionCostPercentage: parseFloat(e.target.value)})} 
                  />
                  <span className="text-sm text-muted-foreground">
                      Example: <strong>25</strong>% of marks.
                  </span>
                </div>
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
          <CardFooter>
            <Button onClick={handleSave} size="lg" className="w-full md:w-auto">
              <Save className="mr-2" />
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
