'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Loader2, Trash2, Plus, BrainCircuit, Wand2, Settings2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { collection, doc, addDoc, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import AiUsagePage from '@/app/(app)/ai-usage/page';

interface AIProviderConfig {
  id?: string;
  label: string;
  provider: string;
  apiKey: string;
  gradingModel: string;
  active: boolean;
}

interface ActiveAiSettings {
  gradingId: string;
  generationId: string;
}

export default function AiSettingsPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeConfig, setActiveConfig] = useState<ActiveAiSettings>({
    gradingId: '',
    generationId: ''
  });
  
  const [newEntry, setNewEntry] = useState<Partial<AIProviderConfig>>({
    provider: 'google-gemini',
    active: true
  });
  
  const [isAdding, setIsAdding] = useState(false);

  // Firestore Collections
  const providersRef = useMemoFirebase(() => 
    firestore ? collection(firestore, 'ai_providers') : null, [firestore]);
  
  const { data: remoteProviders, isLoading: areProvidersLoading } = useCollection<AIProviderConfig>(providersRef);

  // 1. Authorization Check
  useEffect(() => {
    if (!isUserProfileLoading && userProfile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isUserProfileLoading, router]);

  // 2. Fetch Active Engine Configuration
  useEffect(() => {
    const fetchActive = async () => {
      if (!firestore) return;
      try {
        const docRef = doc(firestore, 'settings', 'ai_active');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setActiveConfig(snap.data() as ActiveAiSettings);
        }
      } catch (error) {
        console.error("Failed to fetch active AI settings", error);
      }
    };
    fetchActive();
  }, [firestore]);

  // 3. Handlers
  const handleAddProvider = async () => {
    if (!providersRef || !newEntry.label || !newEntry.apiKey || !newEntry.gradingModel) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required fields." });
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(providersRef, newEntry);
      setNewEntry({ provider: 'google-gemini', active: true }); // Reset form
      toast({ title: "Provider Added", description: "New AI configuration is ready to use." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save provider." });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveActive = async (type: keyof ActiveAiSettings, id: string) => {
    if (!firestore) return;
    try {
      const activeRef = doc(firestore, 'settings', 'ai_active');
      await setDoc(activeRef, { [type]: id }, { merge: true });
      setActiveConfig(prev => ({ ...prev, [type]: id }));
      toast({ title: "Engine Updated", description: `Active ${type === 'gradingId' ? 'grading' : 'generation'} model updated.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update active engine." });
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'ai_providers', id);
    await updateDoc(docRef, { active: !currentStatus });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to delete this provider? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(firestore, 'ai_providers', id));
      toast({ title: "Deleted", description: "Provider configuration removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete provider." });
    }
  };

  if (isUserProfileLoading || areProvidersLoading) {
    return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userProfile?.role !== 'admin') return null;

  return (
    <div className="px-4 pb-10">
      <PageHeader
        title="AI Engine Management"
        description="Manage dynamic API keys and model routing for assessment and generation."
      />

      <div className="space-y-6 mt-6">
        
        {/* --- SECTION 1: PROVIDER MANAGEMENT --- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Registered Providers</CardTitle>
              <CardDescription>Configure API keys and model versions.</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add AI Provider</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input 
                      placeholder="e.g. Gemini 1.5 Pro (Powerful)" 
                      value={newEntry.label || ''} 
                      onChange={e => setNewEntry({...newEntry, label: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider Type</Label>
                    <Select value={newEntry.provider} onValueChange={v => setNewEntry({...newEntry, provider: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="google-gemini">Google Gemini</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter API Key" 
                      value={newEntry.apiKey || ''} 
                      onChange={e => setNewEntry({...newEntry, apiKey: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model Name</Label>
                    <Input 
                      placeholder="e.g. gemini-1.5-pro" 
                      value={newEntry.gradingModel || ''} 
                      onChange={e => setNewEntry({...newEntry, gradingModel: e.target.value})} 
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddProvider} disabled={isAdding}>
                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Configuration'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remoteProviders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No providers found. Add a key to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  remoteProviders?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium pl-6">{p.label}</TableCell>
                      <TableCell className="capitalize">{p.provider}</TableCell>
                      <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{p.gradingModel}</code></TableCell>
                      <TableCell>
                        <Badge 
                          variant={p.active ? "default" : "secondary"} 
                          className="cursor-pointer select-none" 
                          onClick={() => toggleStatus(p.id!, p.active)}
                        >
                          {p.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id!)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- SECTION 2: TASK ROUTING --- */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>Default Application Engines</CardTitle>
            </div>
            <CardDescription>Assign specific providers to application tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Grading Engine */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <BrainCircuit className="h-4 w-4 text-blue-500" /> 
                  Assessment Engine (Grading)
                </Label>
                <Select 
                  value={activeConfig.gradingId} 
                  onValueChange={(id) => handleSaveActive('gradingId', id)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select provider for grading" />
                  </SelectTrigger>
                  <SelectContent>
                    {remoteProviders?.filter(p => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id!}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Handles handwriting analysis and complex feedback.</p>
              </div>

              {/* Generation Engine */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <Wand2 className="h-4 w-4 text-purple-500" /> 
                  Question Engine (Generation)
                </Label>
                <Select 
                  value={activeConfig.generationId} 
                  onValueChange={(id) => handleSaveActive('generationId', id)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select provider for generation" />
                  </SelectTrigger>
                  <SelectContent>
                    {remoteProviders?.filter(p => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id!}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Handles automated worksheet and question creation.</p>
              </div>

            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Routing changes apply immediately to all server-side tasks.
            </p>
          </CardFooter>
        </Card>
        
        {/* --- AI USAGE MODAL --- */}
        <div className="mt-6 flex justify-center">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <BarChart3 className="mr-2 h-4 w-4" /> AI Usage Analytics
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    <AiUsagePage />
                </DialogContent>
            </Dialog>
        </div>

      </div>
    </div>
  );
}
