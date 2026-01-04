'use client';

import { PageHeader } from "@/components/page-header";
import { WalletBalances } from "@/components/wallet/wallet-balances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    // Added 'px-4' for mobile gutter, 'md:px-8' for desktop spacing
    <div className="container mx-auto py-4 px-4 md:py-6 md:px-8 space-y-6 md:space-y-8">
      
      <PageHeader
        title="My Wallet"
        description="View your balances, exchange currencies, and see your transaction history."
      />

      <WalletBalances userProfile={userProfile} />

      <Tabs defaultValue="coupon" className="w-full">
        {/* TabsList Changes for Mobile:
           1. h-auto: Allows the list to grow in height if text wraps (prevents cut-off).
           2. p-1: Slightly tighter padding on mobile.
        */}
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/80 rounded-xl">
          {/* TabsTrigger Changes for Mobile:
             1. text-[10px] xs:text-xs: Smaller text on very small screens to fit 3 columns.
             2. whitespace-normal: Allows text like "Transaction History" to wrap to two lines.
             3. h-auto py-2: Ensures the button grows to fit wrapped text.
          */}
          <TabsTrigger 
            value="coupon" 
            className="text-[10px] xs:text-xs md:text-sm h-auto py-2 md:py-1.5 whitespace-normal leading-tight"
          >
            Surprise Coupon
          </TabsTrigger>
          <TabsTrigger 
            value="swap" 
            className="text-[10px] xs:text-xs md:text-sm h-auto py-2 md:py-1.5 whitespace-normal leading-tight"
          >
            Currency Swap
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="text-[10px] xs:text-xs md:text-sm h-auto py-2 md:py-1.5 whitespace-normal leading-tight"
          >
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupon" className="mt-4 md:mt-6">
          <SurpriseCoupon userProfile={userProfile} />
        </TabsContent>

        <TabsContent value="swap" className="mt-4 md:mt-6">
          <CurrencySwap userProfile={userProfile} />
        </TabsContent>

        <TabsContent value="history" className="mt-4 md:mt-6">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}