// src/components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-line bg-panel p-4", className)}>{children}</div>;
}
