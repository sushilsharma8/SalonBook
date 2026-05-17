import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm',
  secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100',
  danger: 'bg-white text-red-600 hover:bg-red-50 border border-stone-200 hover:border-red-200',
  amber: 'bg-amber-500 text-stone-900 hover:bg-amber-400 shadow-sm',
  outline: 'bg-white text-stone-900 hover:bg-stone-50 border border-stone-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-4 text-base rounded-xl',
  icon: 'p-2.5 rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-150 ease-out',
        'active:scale-[0.97] active:brightness-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        'select-none cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />}
      <span className={clsx(loading && 'opacity-90')}>{children}</span>
    </button>
  );
});
