import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[7px] border border-transparent text-[12.5px] font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-rust aria-invalid:text-rust [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-cobalt text-paper hover:bg-cobalt-deep',
        outline: 'border-line-strong bg-transparent text-ink hover:bg-soft',
        secondary: 'bg-soft text-ink hover:bg-tint',
        ghost: 'bg-transparent text-ink hover:bg-soft',
        destructive: 'border-rust/30 bg-transparent text-rust hover:bg-rust/10',
        link: 'text-cobalt underline-offset-4 hover:underline',
        tang: 'bg-tangerine text-ink hover:brightness-95',
        light: 'bg-paper text-ink hover:bg-soft',
      },
      size: {
        default: 'h-10 px-4',
        xs: 'h-7 gap-1 rounded-md px-2 text-[11px]',
        sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
        lg: 'h-[46px] px-5 text-[13.5px]',
        icon: 'size-10',
        'icon-xs': 'size-7 rounded-md',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
