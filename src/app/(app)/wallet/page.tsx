'use client';

import { PageHeader } from "@/components/page-header";
import { WalletBalances } from "@/components/wallet/wallet-balances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CurrencySwap } from "@/components/wallet/currency-swap";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { SurpriseCoupon } from "@/components/wallet/surprise-coupon";

export default function WalletPage() {
  const { userProfile, isUserProfileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
      if (!isUserProfileLoading && userProfile?.role !== 'student') {
          router.push('/dashboard');
      }
  }, [userProfile, isUserProfileLoading, router]);

  if (isUserProfileLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (userProfile.role !== 'student') {
      return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="My Wallet"
        description="View your balances, exchange currencies, and see your transaction history."
      />

      <Tabs defaultValue="swap" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="swap">Currency Swap</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="swap" className="mt-6">
          <CurrencySwap userProfile={userProfile} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
      
      <WalletBalances userProfile={userProfile} />

      <SurpriseCoupon userProfile={userProfile} />

    </div>
  );
}
