"use client";

import { WalletProvider } from "./WalletProvider";
import { SessionKeyProvider } from "@/context/SessionKeyContext";
import { ThemeProvider } from "./ThemeProvider";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ConnectButton } from "@/components/ConnectButton";
import { SessionKeyToggle } from "@/components/SessionKeyToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="rise-wallet-demo-theme"
      attribute="class"
      enableSystem
      // disableTransitionOnChange
    >
      <WalletProvider>
        <SessionKeyProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              {/* Header */}
              <header className="bg-background border-b border-border sticky top-0 z-10">
                <div className="flex justify-between items-center h-16 px-6">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <ConnectButton />
                  </div>
                </div>
              </header>

              {/* Session Key Toggle */}
              <div className="px-6 pt-4">
                <SessionKeyToggle />
              </div>

              {/* Main Content */}
              <main className="px-6 py-8">
                <div className="max-w-md mx-auto">{children}</div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </SessionKeyProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
