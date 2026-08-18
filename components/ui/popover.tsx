'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props & {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} align={align}>
        <PopoverPrimitive.Popup
          className={cn(
            'z-50 w-48 rounded-xl bg-card p-3 text-sm shadow-lg ring-1 ring-foreground/10 data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
