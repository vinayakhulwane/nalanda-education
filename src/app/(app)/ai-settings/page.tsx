'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // FIXED: Added this import
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIProviderConfig {
  id?: string;
  label: string;
  provider: string;
  apiKey: string;
  gradingModel: string;
  active: boolean;
}

export default function DynamicAiSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const providersRef = useMemoFirebase(() => 
    firestore ? collection(firestore, 'ai_providers') : null, [firestore]);
  
  const { data: remoteProviders, isLoading } = useCollection<AIProviderConfig>(providersRef);

  const [newEntry, setNewEntry] = useState<Partial<AIProviderConfig>>({
    provider: 'google-gemini',
    active: true
  });

  const handleAddProvider = async () => {
    if (!providersRef || !newEntry.label || !newEntry.apiKey) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all fields." });
      return;
    }
    await addDoc(providersRef, newEntry);
    setNewEntry({ provider: 'google-gemini', active: true }); // Reset
    toast({ title: "Provider Added", description: "New AI configuration is now live." });
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'ai_providers', id);
    await updateDoc(docRef, { active: !currentStatus });
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeader title="AI Engine Management" description="Manage dynamic API keys and model routing." />

      <div className="rounded-md border bg-card">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-semibold text-lg">Registered Providers</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add AI Provider</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Friendly Label</Label>
                  <Input placeholder="e.g. Production Gemini" onChange={e => setNewEntry({...newEntry, label: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select onValueChange={v => setNewEntry({...newEntry, provider: v})}>
                      <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="google-gemini">Google Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" placeholder="sk-..." onChange={e => setNewEntry({...newEntry, apiKey: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Model Name</Label>
                  <Input placeholder="e.g. gemini-1.5-flash" onChange={e => setNewEntry({...newEntry, gradingModel: e.target.value})} />
                </div>
                <Button className="w-full" onClick={handleAddProvider}>Save Configuration</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remoteProviders?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.label}</TableCell>
                <TableCell className="capitalize">{p.provider}</TableCell>
                <TableCell><code className="bg-muted px-1 rounded">{p.gradingModel}</code></TableCell>
                <TableCell>
                  <Badge 
                    variant={p.active ? "default" : "secondary"} 
                    className="cursor-pointer" 
                    onClick={() => toggleActive(p.id!, p.active)}
                  >
                    {p.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(firestore!, 'ai_providers', p.id!))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="max-w-md p-6 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 mb-4 text-primary font-bold">
            <Settings2 className="w-5 h-5" />
            <h4>Default Application Engine</h4>
        </div>
        <Label>Select Active Config for App</Label>
        <Select>
          <SelectTrigger className="bg-background mt-2">
            <SelectValue placeholder="Choose a registered config..." />
          </SelectTrigger>
          <SelectContent>
            {remoteProviders?.filter(p => p.active).map((p) => (
              <SelectItem key={p.id} value={p.id!}>
                {p.label} ({p.gradingModel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}