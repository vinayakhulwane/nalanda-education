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
import { cn } from "@/lib/utils"; // Ensure you have this utility or use standard class strings

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
    <div className="container mx-auto py-4 px-4 md:py-6 md:px-8 space-y-6 md:space-y-8">
      
      <PageHeader
        title="My Wallet"
        description="View your balances, exchange currencies, and see your transaction history."
      />

      <WalletBalances userProfile={userProfile} />

      <Tabs defaultValue="coupon" className="w-full">
        
        {/* --- TABS LIST --- */}
        <TabsList className={cn(
            // Mobile: Horizontal Scroll (Sliding), Transparent Background, Spaced items
            "flex w-full overflow-x-auto no-scrollbar gap-2 bg-transparent p-0 h-auto",
            // Desktop: Grid Layout, Muted Background, Standard Padding
            "md:grid md:grid-cols-3 md:gap-0 md:bg-muted/80 md:p-1 md:rounded-xl"
        )}>
          {['coupon', 'swap', 'history'].map((val) => (
             <TabsTrigger 
               key={val}
               value={val} 
               className={cn(
                 // Base Styles
                 "whitespace-nowrap transition-all duration-200",
                 
                 // Mobile Styles: Pill Shape, Border, Min-Width for touch
                 "rounded-full border bg-background px-4 py-2.5 text-xs font-medium shadow-sm min-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                 
                 // Desktop Styles: Standard Segmented Control Look (Overrides Mobile)
                 "md:rounded-md md:border-none md:bg-transparent md:px-3 md:py-1.5 md:text-sm md:shadow-none md:min-w-0 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
               )}
             >
               {val === 'coupon' && "Surprise Coupon"}
               {val === 'swap' && "Currency Swap"}
               {val === 'history' && "History"}
             </TabsTrigger>
          ))}
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