'use client';

import { useState } from 'react';
import type { User, CurrencyType, WalletTransaction } from '@/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Coins, Crown, Gem, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';

interface AdminWalletManagerProps {
  student: User;
}

export function AdminWalletManager({ student }: AdminWalletManagerProps) {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('coin');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState<'add' | 'remove'>('add');

  const handleTransaction = async () => {
    if (!firestore || !adminUser) return;
    const numAmount = parseInt(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive number.' });
      return;
    }
    if (!description.trim()) {
        toast({ variant: 'destructive', title: 'Description Required', description: 'Please provide a reason for this transaction.' });
        return;
    }

    const currentBalance = student[currency === 'coin' ? 'coins' : currency] || 0;
    if (operation === 'remove' && numAmount > currentBalance) {
        toast({ variant: 'destructive', title: 'Insufficient Funds', description: `This student only has ${currentBalance} ${currency}.` });
        return;
    }
    
    setIsLoading(true);
    const batch = writeBatch(firestore);
    const studentRef = doc(firestore, 'users', student.id);
    const transactionRef = doc(collection(firestore, 'transactions'));
    
    const finalAmount = operation === 'add' ? numAmount : -numAmount;
    const updateField = currency === 'coin' ? 'coins' : currency;

    try {
      batch.update(studentRef, { [updateField]: currentBalance + finalAmount });
      
      batch.set(transactionRef, {
        userId: student.id,
        type: operation === 'add' ? 'earned' : 'spent',
        description: `Admin: ${description}`,
        amount: numAmount,
        currency: currency,
        createdAt: serverTimestamp(),
        adminId: adminUser.uid, // Track which admin did this
      });
      
      await batch.commit();

      toast({ title: 'Transaction Successful', description: `Wallet has been updated for ${student.name}.` });
      setAmount('');
      setDescription('');

    } catch (error: any) {
      console.error("Wallet transaction error:", error);
      toast({ variant: 'destructive', title: 'Transaction Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Management</CardTitle>
        <CardDescription>Manually add or remove currency from the student's wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-4 bg-muted/50 rounded-lg">
                <Coins className="h-6 w-6 mx-auto text-yellow-500" />
                <p className="text-2xl font-bold mt-2">{student.coins || 0}</p>
                <p className="text-xs text-muted-foreground">Coins</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
                <Crown className="h-6 w-6 mx-auto text-amber-500" />
                <p className="text-2xl font-bold mt-2">{student.gold || 0}</p>
                <p className="text-xs text-muted-foreground">Gold</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
                <Gem className="h-6 w-6 mx-auto text-blue-500" />
                <p className="text-2xl font-bold mt-2">{student.diamonds || 0}</p>
                <p className="text-xs text-muted-foreground">Diamonds</p>
            </div>
        </div>
        
        <Separator className="my-4" />

        <Tabs value={operation} onValueChange={(v) => setOperation(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add"><Plus className="mr-2" /> Add Currency</TabsTrigger>
                <TabsTrigger value="remove"><Minus className="mr-2" /> Remove Currency</TabsTrigger>
            </TabsList>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input 
                type="number" 
                placeholder="Amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="md:col-span-1"
            />
            <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                <SelectTrigger className="w-full capitalize md:col-span-1">
                    <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="coin"><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-yellow-500" /> Coins</div></SelectItem>
                    <SelectItem value="gold"><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Gold</div></SelectItem>
                    <SelectItem value="diamond"><div className="flex items-center gap-2"><Gem className="h-4 w-4 text-blue-500" /> Diamonds</div></SelectItem>
                </SelectContent>
            </Select>
            <Input 
                placeholder="Reason / Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="md:col-span-3"
            />
        </div>
        <Button 
            onClick={handleTransaction} 
            disabled={isLoading}
            className="w-full mt-4"
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Transaction
        </Button>
      </CardContent>
    </Card>
  );
}