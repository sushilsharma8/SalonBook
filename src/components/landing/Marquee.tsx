import { useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  className?: string;
  pauseOnHover?: boolean;
}

export function Marquee({
  children,
  speed = 35,
  className = '',
  pauseOnHover = true,
}: MarqueeProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={`flex gap-8 overflow-x-auto hide-scrollbar ${className}`}>{children}</div>;
  }

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      style={{ '--marquee-duration': `${speed}s` } as CSSProperties}
    >
      <div
        className={`flex w-max gap-8 animate-marquee ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
