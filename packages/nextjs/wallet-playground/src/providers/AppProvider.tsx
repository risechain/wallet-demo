"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { SessionInfo } from "@/components/SessionInfo";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { WalletConnect } from "@/components/WalletConnect";
import { SessionKeyProvider } from "@/context/SessionKeyContext";
import { ThemeProvider } from "./ThemeProvider";
import { WalletProvider } from "./WalletProvider";

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
    >
      <WalletProvider>
        <SessionKeyProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              {/* Header */}
              <header className="bg-background border-b border-border sticky top-0 z-10">
                <div className="flex justify-between items-center h-16 px-6">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <SessionInfo />
                  </div>
                  <div className="flex items-center gap-4">
                    <WalletConnect />
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="p-6">
                <div className="max-w-lg min-h-[80vh] h-full mx-auto">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </SessionKeyProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
