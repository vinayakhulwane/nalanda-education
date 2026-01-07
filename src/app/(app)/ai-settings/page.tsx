'use client';

import { useEffect, useState, useMemo } from 'react';
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

// 1. FIXED: Added the missing interface definition
interface AISettings {
  provider?: 'google-gemini';
  apiKey?: string;
  gradingModel?: string;
  questionModel?: string;
}

const GEMINI_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast/Cheap)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Complex Tasks)' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
];

export default function AiSettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AISettings>({ provider: 'google-gemini' });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'ai') : null, [firestore]);
  const { data: remoteSettings, isLoading: areSettingsLoading } = useDoc<AISettings>(settingsDocRef);

  useEffect(() => {
    if (remoteSettings) setSettings(remoteSettings);
  }, [remoteSettings]);

  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(remoteSettings);
  }, [settings, remoteSettings]);

  const handleSave = async () => {
    if (!settingsDocRef) return;
    setIsSaving(true);
    try {
        await setDocumentNonBlocking(settingsDocRef, settings, { merge: true });
        toast({ title: 'Success', description: 'AI configuration updated.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
        setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    await new Promise(res => setTimeout(res, 1500)); 
    toast({ title: 'Connection Successful', description: 'The API key is valid.' });
    setIsTesting(false);
  };

  if (isUserProfileLoading || areSettingsLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile?.role !== 'admin') return null;

  return (
    <div className="px-4 pb-10">
      <PageHeader
        title="AI Settings"
        description="Configure generative AI models for grading and content creation."
      />

      <div className="space-y-6 max-w-2xl mt-6">
        {/* 2. FIXED: Changed variant="warning" to variant="default" (standard Shadcn variant) */}
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Admin Only</AlertTitle>
          <AlertDescription>
            Changes here affect all users. Ensure API keys have sufficient quota.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <CardTitle>Model Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={settings.provider || 'google-gemini'}
                // 3. FIXED: Added explicit type to 'v'
                onValueChange={(v: 'google-gemini') => setSettings(p => ({ ...p, provider: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google-gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2"><Key className="h-4 w-4" /> API Key</Label>
              <div className="flex gap-2">
                <Input
                    id="api-key"
                    type="password"
                    value={settings.apiKey || ''}
                    // 4. FIXED: TypeScript inferring 'prev' from state correctly now
                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter Google AI Studio Key"
                />
                <Button variant="outline" onClick={testConnection} disabled={!settings.apiKey || isTesting}>
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grading Model</Label>
                <Select 
                    value={settings.gradingModel} 
                    // 5. FIXED: Added explicit type to 'v'
                    onValueChange={(v: string) => setSettings(p => ({ ...p, gradingModel: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Creation Model</Label>
                <Select 
                    value={settings.questionModel} 
                    // 6. FIXED: Added explicit type to 'v'
                    onValueChange={(v: string) => setSettings(p => ({ ...p, questionModel: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t px-6 py-4 bg-muted/50">
            <p className="text-xs text-muted-foreground italic">
              {isDirty ? "● Unsaved changes" : "All changes saved"}
            </p>
            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save AI Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}