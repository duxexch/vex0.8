import React from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import { LIMIT } from '../motion/tokens';

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonState = 'idle' | 'success' | 'error';
export type ButtonIconDir = 'next' | 'up' | 'down';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  /** Directional icon micro-motion on hover (Phase 10). 'next' respects RTL. */
  iconDir?: ButtonIconDir;
  magnetic?: boolean;
  magneticStrength?: number;
  spotlight?: boolean;
  tilt?: boolean;
  tiltMaxAngle?: number;
  /** Action feedback: success = check pop + green wash, error = soft nudge + ring (Phase 11–13). */
  state?: ButtonState;
}

/**
 * Premium interactive Button (Phase 3–14, 34, 68).
 *
 * States: idle / hover / focus-visible / pressed / disabled / loading / success / error.
 * Depth: layered background + state-driven elevation; press = translateY + scale (fast).
 * Pointer: spotlight lighting + optional tilt/magnetic via usePointerInteraction
 * (rAF + CSS vars — no React re-renders; clamped by LIMIT; off for touch/reduced-motion).
 * Loading preserves dimensions and blocks clicks (aria-busy).
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'start',
  iconDir,
  magnetic = false,
  magneticStrength = LIMIT.magneticMaxStrength,
  spotlight = true,
  tilt = false,
  tiltMaxAngle = LIMIT.tiltMaxDeg,
  state = 'idle',
  className = '',
  onClick,
  ...props
}) => {
  const inert = disabled || isLoading || state !== 'idle';

  const buttonRef = usePointerInteraction<HTMLButtonElement>({
    tilt,
    spotlight,
    magnetic,
    magneticStrength,
    tiltMaxAngle,
    disabled: inert,
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (inert) return;
    onClick?.(e);
  };

  const baseClasses =
    'group btn-motion relative inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl select-none text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform-style-preserve-3d';

  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'h-7 px-2.5 text-[10px] gap-1 rounded-lg',
    sm: 'h-8.5 px-3.5 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-xs gap-1.5 rounded-xl',
    lg: 'h-11.5 px-5 text-sm gap-2 rounded-xl',
    xl: 'h-13 px-6 text-base gap-2 rounded-2xl',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-3d-primary text-white',
    gold: 'btn-3d-gold text-slate-950 font-black',
    secondary:
      'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 active:scale-98',
    outline:
      'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 active:scale-98',
    ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600 active:scale-98 transition-colors',
    destructive:
      'bg-rose-600 hover:bg-rose-700 active:scale-98 text-white shadow-2xs hover:shadow-xs shadow-rose-600/10',
  };

  const feedbackClass =
    state === 'success' ? 'btn-feedback-success' : state === 'error' ? 'btn-feedback-error' : '';

  const iconDirAttr = iconDir ? ({ 'data-dir': iconDir } as const) : undefined;

  return (
    <button
      ref={buttonRef}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-live={state !== 'idle' ? 'polite' : undefined}
      onClick={handleClick}
      className={[
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        feedbackClass,
        spotlight ? 'spotlight-surface' : '',
        tilt ? 'tilt-card-3d' : '',
        magnetic ? 'magnetic-target' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        transform: `
          perspective(1000px)
          rotateX(var(--tilt-x, 0deg))
          rotateY(var(--tilt-y, 0deg))
          translate3d(var(--magnetic-x, 0px), var(--magnetic-y, 0px), 0)
        `,
      }}
      {...props}
    >
      {/* Pointer spotlight layer */}
      {spotlight && (
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-inherit bg-[radial-gradient(var(--spotlight-radius,600px)_circle_at_var(--spotlight-x,50%)_var(--spotlight-y,50%),rgba(255,255,255,0.22),transparent_60%)] transition-opacity duration-200"
          style={{ opacity: 'var(--spotlight-opacity, 0)' }}
        />
      )}

      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
          <span>{children}</span>
        </span>
      ) : state === 'success' ? (
        <span className="flex items-center gap-1.5" role="status">
          <Check aria-hidden="true" className="w-4 h-4 animate-state-pop stroke-[3]" />
          <span>{children}</span>
        </span>
      ) : state === 'error' ? (
        <span className={`flex items-center gap-1.5 ${'animate-soft-nudge'}`} role="alert">
          <AlertCircle aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
          <span>{children}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          {icon && iconPosition === 'start' && (
            <span className="btn-icon" {...iconDirAttr}>
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'end' && (
            <span className="btn-icon" {...iconDirAttr}>
              {icon}
            </span>
          )}
        </span>
      )}
    </button>
  );
};
