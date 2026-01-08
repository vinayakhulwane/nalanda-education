import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { Inter, Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/utils';
// We need these for Mobile First. If they crash, share the error and we will fix them.
import { MobileHeader } from '@/components/mobile-header'; 
import { MobileNav } from '@/components/mobile-nav';       

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'Nalanda',
  description: 'The personalized platform for academic excellence.',
  manifest: '/manifest.json',
};

// 1. Improved Viewport for Mobile
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility (best practice)
  userScalable: true, 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "flex flex-col min-h-screen font-body antialiased bg-background text-foreground", 
        fontBody.variable, 
        fontHeadline.variable
      )}>
        <FirebaseClientProvider>
          
          {/* 2. Mobile Header: Visible on mobile, hidden on Desktop */}
          {/* Add 'lg:hidden' to the component itself or a wrapper here if it doesn't hide itself */}
          <div className="block lg:hidden sticky top-0 z-50">
             <MobileHeader /> 
          </div>

          {/* 3. Main Content Area */}
          {/* pb-20: Adds bottom padding on mobile so content isn't hidden behind the Bottom Nav */}
          {/* lg:pb-0: Removes that padding on Desktop */}
          <main className="flex-1 w-full overflow-x-hidden pb-20 lg:pb-0">
            {children}
          </main>

          {/* 4. Mobile Bottom Nav: Fixed to bottom on mobile, hidden on Desktop */}
          <div className="block lg:hidden">
             <MobileNav /> 
          </div>

        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}