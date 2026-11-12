import * as React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex w-full border border-line bg-panel px-3 py-2 text-sm text-ink focus:outline-none focus:border-acid ${className ?? ""}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
