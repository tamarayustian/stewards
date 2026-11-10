import { avatarColor, initials } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const sizes = {
  xs: 22,
  sm: 26,
  md: 32,
  lg: 38,
} as const;

export function PersonAvatar({
  name,
  size = 'sm',
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const px = sizes[size];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-paper',
        className,
      )}
      style={{
        width: px,
        height: px,
        backgroundColor: avatarColor(name),
        fontSize: Math.round(px * 0.34),
      }}
    >
      {initials(name)}
    </span>
  );
}
