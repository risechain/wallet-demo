"use client";

import Image from "next/image";
import Link from "next/link";

import { useUserPreference } from "@/context/UserPreference";
import { useTransaction } from "@/hooks/useTransaction";
import { Separator } from "@ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ui/sidebar";
import { ArrowLeftRight, Coins, Key, Send } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

const demoItems = [
  {
    title: "Transfer",
    url: "/transfer",
    icon: Send,
  },
  {
    title: "Swap",
    url: "/swap",
    icon: ArrowLeftRight,
  },
  {
    title: "Mint",
    url: "/mint",
    icon: Coins,
  },
  {
    title: "Session Keys",
    url: "/session-keys",
    icon: Key,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { isSessionKeyEnabled, enableSessionKey } = useUserPreference();

  const [hasMounted, setHasMounted] = useState(false);

  const { checkWalletKeys } = useTransaction();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <Sidebar>
      <div className="relative shrink-0">
        <div aria-hidden="true" className="absolute inset-0" />
        <div className="flex items-center p-4">
          <Image
            src={
              resolvedTheme === "light" && hasMounted
                ? "/icons/rise-black.svg"
                : "/icons/rise-white.svg"
            }
            width={92}
            height={120}
            alt="RISE Logo"
            priority
          />
        </div>
      </div>

      <SidebarContent>
        <Separator />
        <SidebarGroup>
          <SidebarGroupLabel>Demo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {demoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span className="text-inherit">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Preference</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-4">
              <SidebarMenuItem className="flex justify-between items-center">
                <p>Theme</p>
                <ThemeToggle />
              </SidebarMenuItem>
              <SidebarMenuItem className="flex justify-between items-center">
                <p>Use Session Key</p>
                <Switch
                  className="w-12"
                  thumbClassName="data-[state=unchecked]:-translate-x-1 data-[state=checked]:translate-x-4 h-8 w-8 border"
                  checked={isSessionKeyEnabled}
                  onCheckedChange={enableSessionKey}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Debug</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-4">
              <SidebarMenuItem className="flex justify-between items-center">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    checkWalletKeys();
                  }}
                >
                  Check Wallet Keys
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
