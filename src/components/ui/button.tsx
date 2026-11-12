// src/components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center border text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-bg hover:border-acid hover:bg-acid",
        accent: "border-acid bg-acid text-bg hover:border-ink hover:bg-ink",
        outline: "border-line text-ink hover:border-acid hover:text-acid",
        destructive: "border-hot text-hot hover:bg-hot hover:text-bg",
      },
      size: {
        default: "px-4 py-3",
        sm: "px-3 py-2 whitespace-nowrap",
        lg: "px-6 py-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={`${buttonVariants({ variant, size })} ${className ?? ""}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
