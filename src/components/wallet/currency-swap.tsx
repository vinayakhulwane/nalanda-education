'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeftRight, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { User, CurrencyType, EconomySettings } from "@/types";

export function CurrencySwap({ userProfile }: { userProfile: User | null | undefined }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [payAmount, setPayAmount] = useState<string>("");
  const [payCurrency, setPayCurrency] = useState<CurrencyType>("coin");
  const [receiveCurrency, setReceiveCurrency] = useState<CurrencyType>("gold");
  const [isSwapping, setIsSwapping] = useState(false);

  // --- NEW: Fetch dynamic rates from Admin Settings ---
  const economySettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'economy') : null, [firestore]);
  const { data: economySettings, isLoading: isSettingsLoading } = useDoc<EconomySettings>(economySettingsRef);

  // Calculate dynamic rate based on admin settings
  const currentRate = useMemo(() => {
    if (!economySettings || payCurrency === receiveCurrency) return 1;

    const coinsPerGold = economySettings.coinsPerGold || 10;
    const goldPerDiamond = economySettings.goldPerDiamond || 10;

    // Define conversion logic
    if (payCurrency === "coin" && receiveCurrency === "gold") return 1 / coinsPerGold;
    if (payCurrency === "gold" && receiveCurrency === "diamond") return 1 / goldPerDiamond;
    
    // Reverse conversions (usually same rate or slightly less for "sell back")
    if (payCurrency === "gold" && receiveCurrency === "coin") return coinsPerGold;
    if (payCurrency === "diamond" && receiveCurrency === "gold") return goldPerDiamond;

    return 0;
  }, [economySettings, payCurrency, receiveCurrency]);

  const receiveAmount = useMemo(() => {
    const amount = parseFloat(payAmount) || 0;
    const calculated = amount * currentRate;
    // We use Math.floor to ensure students don't get partial "dust" currency
    return Math.floor(calculated * 100) / 100;
  }, [payAmount, currentRate]);

  const userBalance = useMemo(() => {
    if (payCurrency === "coin") return userProfile?.coins || 0;
    if (payCurrency === "gold") return userProfile?.gold || 0;
    if (payCurrency === "diamond") return userProfile?.diamonds || 0;
    return 0;
  }, [userProfile, payCurrency]);

  const canSwap = useMemo(() => {
    const amount = parseFloat(payAmount) || 0;
    return amount > 0 && amount <= userBalance && payCurrency !== receiveCurrency && currentRate > 0;
  }, [payAmount, userBalance, payCurrency, receiveCurrency, currentRate]);

  const handleSwap = async () => {
    if (!user || !firestore || !canSwap) return;
    setIsSwapping(true);

    try {
      const userRef = doc(firestore, 'users', user.uid);
      const amountToPay = parseFloat(payAmount);
      const amountToReceive = receiveAmount;

      const updatePayload: any = {};
      const fieldMap: Record<string, string> = { coin: 'coins', gold: 'gold', diamond: 'diamonds' };
      
      updatePayload[fieldMap[payCurrency]] = increment(-amountToPay);
      updatePayload[fieldMap[receiveCurrency]] = increment(amountToReceive);

      await updateDoc(userRef, updatePayload);

      toast({ 
        title: "Swap Successful!", 
        description: `Exchanged ${amountToPay} ${payCurrency}s for ${amountToReceive} ${receiveCurrency}s.` 
      });
      setPayAmount("");
    } catch (error) {
      console.error("Swap Error:", error);
      toast({ variant: "destructive", title: "Swap Failed", description: "Transaction could not be completed." });
    } finally {
      setIsSwapping(false);
    }
  };

  if (isSettingsLoading) {
    return (
      <Card className="max-w-4xl mx-auto flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </Card>
    );
  }

  const getRateDescription = () => {
    if (payCurrency === receiveCurrency || currentRate <= 0) return "Select different currencies to see a rate.";

    if (currentRate < 1) {
        return `1 ${receiveCurrency} = ${1 / currentRate} ${payCurrency}s`
    }
    return `1 ${payCurrency} = ${currentRate} ${receiveCurrency}s`
  }


  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Currency Swap</CardTitle>
        <CardDescription>Exchange your earned currencies based on current market rates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-destructive/10 dark:border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-800 dark:text-red-300 font-bold text-base">Market Update</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-400">
            Currency exchange rates are dynamic and set by admin. Please review the current rate before converting.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col md:flex-row items-center gap-4 relative">
          {/* Pay Side */}
          <div className="flex-1 w-full space-y-2 p-6 bg-muted/30 rounded-lg border">
            <span className="text-sm font-semibold text-muted-foreground">You Pay</span>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="0.00" 
                className="text-xl font-bold h-12"
                value={payAmount} 
                onChange={(e) => setPayAmount(e.target.value)} 
              />
              <Select value={payCurrency} onValueChange={(val: any) => setPayCurrency(val)}>
                <SelectTrigger className="w-[140px] h-12 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coin">Coins</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="diamond">Diamonds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm font-medium text-muted-foreground">Balance: {userBalance} {payCurrency}s</span>
          </div>

          <div className="z-10 bg-background rounded-full p-2 border shadow-sm">
             <ArrowLeftRight className="h-6 w-6 text-primary" />
          </div>

          {/* Receive Side */}
          <div className="flex-1 w-full space-y-2 p-6 bg-muted/30 rounded-lg border">
            <span className="text-sm font-semibold text-muted-foreground">You Receive</span>
            <div className="flex gap-2">
              <Input 
                type="text" 
                readOnly 
                className="text-xl font-bold h-12 bg-background"
                value={receiveAmount} 
              />
              <Select value={receiveCurrency} onValueChange={(val: any) => setReceiveCurrency(val)}>
                <SelectTrigger className="w-[140px] h-12 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coin">Coins</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="diamond">Diamonds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {getRateDescription()}
            </span>
          </div>
        </div>

        <Button 
          className="w-full h-14 text-xl font-bold shadow-lg" 
          disabled={!canSwap || isSwapping} 
          onClick={handleSwap}
        >
          {isSwapping ? <Loader2 className="animate-spin mr-2" /> : null}
          {parseFloat(payAmount) > userBalance ? "Insufficient Balance" : "Swap Currencies"}
        </Button>
      </CardContent>
    </Card>
  );
}
