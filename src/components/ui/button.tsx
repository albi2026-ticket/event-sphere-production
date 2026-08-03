import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--button-radius)] text-sm font-bold cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none aria-busy:pointer-events-none aria-busy:opacity-70 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:bg-primary/92 hover:shadow-[var(--shadow-floating)] hover:-translate-y-px",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90 hover:-translate-y-px",
        outline:
          "border border-input bg-background shadow-sm hover:border-ring/45 hover:bg-accent hover:text-accent-foreground hover:-translate-y-px",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:-translate-y-px",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-px",
        link: "h-auto rounded-none px-0 text-primary underline-offset-4 hover:text-accent-foreground hover:underline",
      },
      size: {
        default: "h-[var(--button-height-md)] px-6 py-2.5",
        sm: "h-[var(--button-height-sm)] px-4 text-xs",
        lg: "h-[var(--button-height-lg)] px-8 text-base",
        icon: "h-[var(--button-height-md)] w-[var(--button-height-md)] rounded-[var(--radius-sm)] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
