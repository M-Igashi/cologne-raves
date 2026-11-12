import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-11 w-full border border-line bg-panel px-3 py-2 text-sm text-ink focus:outline-none focus:border-acid ${className ?? ""}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
