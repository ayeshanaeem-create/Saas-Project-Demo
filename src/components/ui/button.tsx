import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Theming: every button is bold. Solid buttons (default, destructive, inverse) carry a
// coloured shadow and lift slightly on hover; outline and ghost buttons use the brand green.
// The 2px border is in the base, so every variant has the same height.
const buttonCva = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[12px] border-2 border-transparent bg-clip-padding text-[16px] font-bold tracking-[0.01em] whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-linear-135 from-brand-from to-brand-to text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary-glow)] hover:-translate-y-0.5 hover:from-brand-hover-from hover:to-brand-hover-to hover:shadow-[0_12px_26px_-10px_var(--primary-glow)]",
        outline:
          "border-primary/55 bg-card text-primary hover:border-primary hover:bg-tint aria-expanded:border-primary aria-expanded:bg-tint",
        secondary:
          "bg-tint text-primary hover:bg-[color-mix(in_oklch,var(--tint),var(--primary)_14%)] aria-expanded:bg-tint",
        ghost:
          "text-primary hover:bg-tint aria-expanded:bg-tint",
        destructive:
          "bg-destructive text-white shadow-[0_8px_20px_-8px_color-mix(in_oklch,var(--destructive)_70%,transparent)] hover:-translate-y-0.5 hover:bg-[color-mix(in_oklch,var(--destructive),black_14%)] focus-visible:border-destructive/40 focus-visible:ring-destructive/30",
        // A quieter danger button for lists (one per row), e.g. "Cancel" on a booking.
        "destructive-outline":
          "border-destructive/40 bg-card text-destructive hover:border-destructive hover:bg-destructive/10 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        // White button for coloured backgrounds (the landing page's call-to-action band).
        inverse:
          "bg-white text-primary shadow-[0_10px_24px_-10px_rgb(0_0_0/0.35)] hover:-translate-y-0.5 hover:bg-tint",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 11px × 20px padding inside the 2px border (px, so it doesn't grow with the 18px base).
        default:
          "gap-2 px-[20px] py-[11px] has-data-[icon=inline-end]:pr-[16px] has-data-[icon=inline-start]:pl-[16px]",
        xs: "h-6 gap-1 px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[10px] px-3 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "gap-2 px-[24px] py-[13px] text-[17px] has-data-[icon=inline-end]:pr-[20px] has-data-[icon=inline-start]:pl-[20px]",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Merged with cn(), so a variant's classes replace the base classes they conflict with
 * (an outline button's border colour beats the base `border-transparent`), including
 * when this styles a plain <Link> or <a> rather than <Button>.
 */
function buttonVariants(props?: Parameters<typeof buttonCva>[0]): string {
  return cn(buttonCva(props))
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonCva>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
