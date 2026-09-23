import { cn } from "cn"

/**
 * A placeholder that only shows once the wait is long enough to notice (150ms), fading in rather
 * than flashing grey at a load that was nearly instant, then pulsing gently. Put
 * `animate-content-in` on whatever replaces it and the two crossfade instead of cutting.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-[skeleton-in_0.3s_var(--ease-out-quint)_0.15s_backwards,pulse_2s_cubic-bezier(0.4,0,0.6,1)_0.45s_infinite] rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
