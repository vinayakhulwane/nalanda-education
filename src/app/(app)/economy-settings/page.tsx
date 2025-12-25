'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import type { EconomySettings } from '@/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export default function EconomySettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<EconomySettings>>({
    coinsPerGold: 10,
    goldPerDiamond: 10,
  });

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'economy');
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
        description="Configure the virtual currency exchange rates for the entire application."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Currency Exchange Rates</CardTitle>
          <CardDescription>
            Define how students can exchange lower-tier currency for higher-tier ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Global Impact Warning</AlertTitle>
            <AlertDescription>
              Changes made on this page are global and will affect all users immediately. Proceed with caution.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="coins-per-gold">Coins required for 1 Gold</Label>
            <Input
              id="coins-per-gold"
              type="number"
              value={settings.coinsPerGold || ''}
              onChange={(e) => setSettings({ ...settings, coinsPerGold: parseInt(e.target.value, 10) || 0 })}
              placeholder="e.g., 10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gold-per-diamond">Gold required for 1 Diamond</Label>
            <Input
              id="gold-per-diamond"
              type="number"
              value={settings.goldPerDiamond || ''}
              onChange={(e) => setSettings({ ...settings, goldPerDiamond: parseInt(e.target.value, 10) || 0 })}
              placeholder="e.g., 10"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>
            <Save className="mr-2" />
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
