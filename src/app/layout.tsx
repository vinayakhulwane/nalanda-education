import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase'; // <--- UNCOMMENTED THIS
import { Inter, Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/utils';
// import { MobileHeader } from '@/components/mobile-header'; // Keep commented out for now
// import { MobileNav } from '@/components/mobile-nav';       // Keep commented out for now

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

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("flex flex-col min-h-screen font-body antialiased", fontBody.variable, fontHeadline.variable)}>
        {/* We brought the Provider back so the Login Page works */}
        <FirebaseClientProvider>
          
          {/* MobileHeader is still off because it might be crashing the build */}
          {/* <MobileHeader /> */}

          <main className="flex-1 pb-20 lg:pb-0 overflow-x-hidden max-w-[100vw]">
            {children}
          </main>

          {/* MobileNav is still off because it might be crashing the build */}
          {/* <MobileNav /> */}

        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}