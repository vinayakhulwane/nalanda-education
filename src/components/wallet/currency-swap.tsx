'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment, addDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, AlertTriangle, Loader2, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EconomySettings } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

type Currency = 'coins' | 'gold' | 'diamonds' | 'aiCredits';

interface CurrencySwapProps {
  userProfile: any; 
}

export function CurrencySwap({ userProfile }: CurrencySwapProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for bi-directional swapping
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState<Currency>('coins');
  const [toCurrency, setToCurrency] = useState<Currency>('gold');
  const [isSwapping, setIsSwapping] = useState(false);

  // 1. Fetch Real Settings
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: settings } = useDoc<EconomySettings>(settingsRef);

  // 2. Define Base Rates
  const COIN_TO_GOLD = settings?.coinToGold ?? 10;
  const GOLD_TO_DIAMOND = settings?.goldToDiamond ?? 10;
  const GOLD_TO_AICREDITS = 10; // Placeholder, should be in settings

  // Helper: Get 'Value' of a currency relative to Coins (Base Unit)
  const getBaseValue = (currency: Currency) => {
    switch (currency) {
        case 'coins': return 1;
        case 'gold': return COIN_TO_GOLD;
        case 'diamonds': return GOLD_TO_DIAMOND * COIN_TO_GOLD;
        case 'aiCredits': return COIN_TO_GOLD / GOLD_TO_AICREDITS;
    }
  };

  // 3. Calculate Exchange Rate & Output
  const { receiveAmount, exchangeRateText } = useMemo(() => {
    const amount = parseInt(swapAmount) || 0;
    
    const fromValue = getBaseValue(fromCurrency);
    const toValue = getBaseValue(toCurrency);

    // No swap needed if currencies are same
    if (fromCurrency === toCurrency) {
        return { receiveAmount: amount, exchangeRateText: '1:1' };
    }
    
    const ratio = fromValue / toValue;
    const result = Math.floor(amount * ratio);

    let rateText = '';
    if (ratio >= 1) {
        rateText = `1 ${fromCurrency.slice(0,-1)} = ${ratio} ${toCurrency}`;
    } else {
        rateText = `${1/ratio} ${fromCurrency} = 1 ${toCurrency.slice(0,-1)}`;
    }

    return { receiveAmount: result, exchangeRateText: rateText };

  }, [swapAmount, fromCurrency, toCurrency, COIN_TO_GOLD, GOLD_TO_DIAMOND, GOLD_TO_AICREDITS]);


  const currentBalance = userProfile?.[fromCurrency] || 0;

  const handleSwap = async () => {
    if (!user || !firestore || !userProfile) return;
    const amount = parseInt(swapAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid number.' });
      return;
    }
    if (fromCurrency === toCurrency) {
      toast({ variant: 'destructive', title: 'Same Currency', description: 'Please select different currencies.' });
      return;
    }
    if (amount > currentBalance) {
      toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You only have ${currentBalance} ${fromCurrency}.` });
      return;
    }

    setIsSwapping(true);
    try {
      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', user.uid);
      const transactionsCol = collection(firestore, 'transactions');
      
      const fieldMap: Record<string, string> = {
        coins: 'coins',
        gold: 'gold',
        diamonds: 'diamonds',
        aiCredits: 'aiCredits'
      };

      const fromField = fieldMap[fromCurrency];
      const toField = fieldMap[toCurrency];

      // 1. Update user balance
      batch.update(userRef, {
        [fromField]: increment(-amount),
        [toField]: increment(receiveAmount)
      });
      
      // 2. Log 'spent' transaction
      const spentTransactionRef = doc(transactionsCol);
      batch.set(spentTransactionRef, {
        userId: user.uid,
        type: 'spent',
        currency: fromCurrency,
        amount: amount,
        description: `Exchanged for ${receiveAmount} ${toCurrency}`,
        createdAt: serverTimestamp()
      });
      
      // 3. Log 'earned' transaction
      const earnedTransactionRef = doc(transactionsCol);
       batch.set(earnedTransactionRef, {
        userId: user.uid,
        type: 'earned',
        currency: toCurrency,
        amount: receiveAmount,
        description: `Exchanged from ${amount} ${fromCurrency}`,
        createdAt: serverTimestamp()
      });

      // Commit all operations at once
      await batch.commit();

      toast({ title: 'Swap Successful!', description: `You received ${receiveAmount} ${toCurrency}.` });
      setSwapAmount('');
    } catch (error) {
      console.error("Swap error:", error);
      toast({ variant: 'destructive', title: 'Swap Failed', description: 'Could not complete transaction.' });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Exchange</CardTitle>
        <CardDescription>Convert any currency to another instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Info Banner */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dynamic Rates!</AlertTitle>
          <AlertDescription>
            Currency exchange rates may fluctuate. The current rate is: <span className="font-bold">{exchangeRateText}</span>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* FROM SECTION */}
          <div className="flex-1 w-full space-y-2">
             <span className="text-sm font-medium">Convert From</span>
             <div className="flex gap-2">
               <Input 
                 type="number" 
                 value={swapAmount} 
                 onChange={(e) => setSwapAmount(e.target.value)} 
                 placeholder="Amount"
               />
               <Select value={fromCurrency} onValueChange={(v: any) => setFromCurrency(v)}>
                 <SelectTrigger className="w-[130px] capitalize"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="coins">Coins</SelectItem>
                   <SelectItem value="gold">Gold</SelectItem>
                   <SelectItem value="diamonds">Diamonds</SelectItem>
                   <SelectItem value="aiCredits">AI Credits</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Available: {currentBalance}</span>
                <button 
                    onClick={() => setSwapAmount(currentBalance.toString())}
                    className="text-primary hover:underline"
                >
                    Max
                </button>
             </div>
          </div>

          <div className="flex items-center justify-center pt-4 md:pt-0">
             <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 md:rotate-0" />
          </div>

          {/* TO SECTION */}
          <div className="flex-1 w-full space-y-2">
             <span className="text-sm font-medium">Convert To</span>
             <div className="flex gap-2">
               <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-70">
                  {receiveAmount}
               </div>
               <Select value={toCurrency} onValueChange={(v: any) => setToCurrency(v)}>
                 <SelectTrigger className="w-[130px] capitalize"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="coins">Coins</SelectItem>
                   <SelectItem value="gold">Gold</SelectItem>
                   <SelectItem value="diamonds">Diamonds</SelectItem>
                   <SelectItem value="aiCredits">AI Credits</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <p className="text-xs text-muted-foreground px-1">
                 Estimated Output
             </p>
          </div>
        </div>
        
        <Button 
            className="w-full h-12 text-lg" 
            onClick={handleSwap} 
            disabled={isSwapping || receiveAmount <= 0 || fromCurrency === toCurrency}
        >
           {isSwapping && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
           {isSwapping ? 'Processing...' : 'Confirm Swap'}
        </Button>
      </CardContent>
    </Card>
  );
}
