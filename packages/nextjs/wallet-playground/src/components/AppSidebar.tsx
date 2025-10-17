"use client";

import Link from "next/link";

import { ArrowLeftRight, Coins, Key, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ui/sidebar";
import { SessionKeyToggle } from "./SessionKeyToggle";
import { Separator } from "@ui/separator";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const items = [
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

  const [hasMounted, setHasMounted] = useState(false);

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
        <SessionKeyToggle />
        <Separator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
