// src/components/ui/card.tsx
import * as React from "react";

export function Card({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border p-4 shadow-md ${className ?? ""}`}>{children}</div>;
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className ?? ""}`}>{children}</div>;
}

export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 pt-4 pb-2 font-semibold ${className ?? ""}`}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 pt-2 pb-4 ${className ?? ""}`}>{children}</div>;
}
