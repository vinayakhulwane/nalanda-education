'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertTriangle, Save, BrainCircuit, Key, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface AISettings {
    provider?: 'google-gemini';
    apiKey?: string;
    gradingModel?: string;
    questionModel?: string;
}

export default function AiSettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AISettings>({ provider: 'google-gemini' });
  const [isSaving, setIsSaving] = useState(false);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'ai') : null, [firestore]);
  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<AISettings>(settingsDocRef);

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

  const handleSave = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    await setDocumentNonBlocking(settingsDocRef, settings, { merge: true });
    toast({ title: 'AI Settings Saved', description: 'Your AI configuration has been updated.' });
    setIsSaving(false);
  };

  const isLoading = isUserProfileLoading || areSettingsLoading;

  if (isLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile?.role !== 'admin') {
    return null; // Or a dedicated "Access Denied" component
  }

  return (
    <div className="px-4">
      <PageHeader
        title="AI Settings"
        description="Configure the generative AI models for grading and content creation."
      />

      <div className="space-y-6 max-w-2xl mt-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Handle With Care</AlertTitle>
          <AlertDescription>
            Incorrect API keys or model names will cause AI features to fail.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <CardTitle>Model Configuration</CardTitle>
            </div>
            <CardDescription>
              Specify the provider and model names for various AI tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={settings.provider || 'google-gemini'}
                onValueChange={(value) => setSettings(prev => ({ ...prev, provider: value as 'google-gemini' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google-gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2"><Key className="h-4 w-4" /> API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your API key"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grading-model">Grading Model</Label>
                  <Input
                    id="grading-model"
                    value={settings.gradingModel || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, gradingModel: e.target.value }))}
                    placeholder="e.g., gemini-1.5-flash"
                  />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="question-model" className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Question Creation Model</Label>
                   <Input
                    id="question-model"
                    value={settings.questionModel || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, questionModel: e.target.value }))}
                    placeholder="e.g., gemini-1.5-pro"
                  />
                </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save AI Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
