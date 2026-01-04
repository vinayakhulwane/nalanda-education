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
import { cn } from "@/lib/utils";

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
    // 1. Applied the same background wrapper as CoursesPage
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
        
      {/* 2. Applied exact same Container classes: 'container mx-auto px-6 max-w-7xl' */}
      <div className="container mx-auto px-6 max-w-7xl py-8 space-y-8">
        
        <PageHeader
          title="My Wallet"
          description="View your balances, exchange currencies, and see your transaction history."
        />

        <WalletBalances userProfile={userProfile} />

        <Tabs defaultValue="coupon" className="w-full">
          
          {/* Tabs List - Mobile Friendly Sliding */}
          <TabsList className={cn(
              "flex w-full overflow-x-auto no-scrollbar gap-2 bg-transparent p-0 h-auto",
              "md:grid md:grid-cols-3 md:gap-0 md:bg-muted/80 md:p-1 md:rounded-xl"
          )}>
            {['coupon', 'swap', 'history'].map((val) => (
               <TabsTrigger 
                 key={val}
                 value={val} 
                 className={cn(
                   "whitespace-nowrap transition-all duration-200",
                   "rounded-full border bg-background px-4 py-2.5 text-xs font-medium shadow-sm min-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                   "md:rounded-md md:border-none md:bg-transparent md:px-3 md:py-1.5 md:text-sm md:shadow-none md:min-w-0 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                 )}
               >
                 {val === 'coupon' && "Surprise Coupon"}
                 {val === 'swap' && "Currency Swap"}
                 {val === 'history' && "History"}
               </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="coupon" className="mt-6">
            <SurpriseCoupon userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="swap" className="mt-6">
            <CurrencySwap userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {/* Added w-full to ensure it respects container width */}
            <div className="w-full overflow-hidden">
                <TransactionHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}