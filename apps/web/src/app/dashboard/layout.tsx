"use client";

/** Authenticated dashboard layout: guard + shell + realtime socket. */
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  useWebSocket();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return <DashboardShell>{children}</DashboardShell>;
}
