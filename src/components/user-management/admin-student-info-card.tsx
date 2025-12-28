'use client';

import { useState } from 'react';
import type { User, CurrencyType } from '@/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Coins, Crown, Gem, Plus, Minus, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';

interface AdminStudentInfoCardProps {
  student: User;
}

export function AdminStudentInfoCard({ student }: AdminStudentInfoCardProps) {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('coin');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState<'add' | 'remove'>('add');

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

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
      // Step 1: Update the user's wallet balance.
      batch.update(studentRef, { [updateField]: increment(finalAmount) });
      
      // Step 2: Create a corresponding transaction log record.
      batch.set(transactionRef, {
        userId: student.id,
        type: operation === 'add' ? 'earned' : 'spent',
        description: `Admin: ${description}`,
        amount: numAmount,
        currency: currency,
        createdAt: serverTimestamp(),
        adminId: adminUser.uid,
      });
      
      // Step 3: Commit both operations as a single atomic batch.
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
    <Card className="flex flex-col h-full">
      <Tabs defaultValue="info" className="flex flex-col h-full">
        <CardHeader className="text-center items-center">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
            <AvatarImage src={student.avatar} alt={student.name} />
            <AvatarFallback className="text-3xl">{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <CardTitle>{student.name}</CardTitle>
            <TabsList className="grid w-full grid-cols-2 mt-4">
                <TabsTrigger value="info">Info & Wallet</TabsTrigger>
                <TabsTrigger value="manage">Manage Wallet</TabsTrigger>
            </TabsList>
        </CardHeader>
        <TabsContent value="info" className="flex-grow">
            <CardContent className="text-sm text-muted-foreground space-y-2 flex-grow">
                <div className="flex justify-between">
                <span className="font-medium">Role:</span>
                 <Badge variant="secondary" className="capitalize">{student.role}</Badge>
                </div>
                 <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                 <Badge variant={student.active ?? true ? 'default' : 'destructive'} className={student.active ?? true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {student.active ?? true ? 'Active' : 'Blocked'}
                </Badge>
                </div>
                <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{student.email}</span>
                </div>
                <div className="flex justify-between">
                <span className="font-medium">User ID:</span>
                <span className="font-mono text-xs">{student.id}</span>
                </div>
            </CardContent>
            <CardFooter>
                <div className="grid grid-cols-3 gap-4 w-full bg-muted/50 rounded-xl p-4">
                    <div className="flex flex-col items-center">
                        <Coins className="h-6 w-6 text-yellow-500 mb-2" />
                        <p className="text-xl font-bold">{student.coins || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Coins</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Crown className="h-6 w-6 text-amber-500 mb-2" />
                        <p className="text-xl font-bold">{student.gold || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Gold</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Gem className="h-6 w-6 text-blue-500 mb-2" />
                        <p className="text-xl font-bold">{student.diamonds || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Diamonds</p>
                    </div>
                </div>
            </CardFooter>
        </TabsContent>
        <TabsContent value="manage" className="flex-grow">
            <CardContent className="space-y-4">
                <Tabs value={operation} onValueChange={(v) => setOperation(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="add"><Plus className="mr-2" /> Add Currency</TabsTrigger>
                        <TabsTrigger value="remove"><Minus className="mr-2" /> Remove Currency</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        type="number" 
                        placeholder="Amount"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                        <SelectTrigger className="w-full capitalize">
                            <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="coin"><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-yellow-500" /> Coins</div></SelectItem>
                            <SelectItem value="gold"><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Gold</div></SelectItem>
                            <SelectItem value="diamond"><div className="flex items-center gap-2"><Gem className="h-4 w-4 text-blue-500" /> Diamonds</div></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Input 
                    placeholder="Reason / Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <Button 
                    onClick={handleTransaction} 
                    disabled={isLoading}
                    className="w-full"
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Transaction
                </Button>
            </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
