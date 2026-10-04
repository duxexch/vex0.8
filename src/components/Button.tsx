import React, { useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  magnetic?: boolean;
  magneticStrength?: number;
  spotlight?: boolean;
  tilt?: boolean;
  tiltMaxAngle?: number;
}

/**
 * World-Class, Production-Grade 3D Tactical Button System
 * Built with full accessibility, state-preservation, tactile physics, pointer spotlight,
 * magnetic micro-interactions, and high-performance passive rendering.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'start',
  magnetic = false,
  magneticStrength = 0.15,
  spotlight = true,
  tilt = false,
  tiltMaxAngle = 4,
  className = '',
  onClick,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Dynamic Pointer Tracking Engine
  useEffect(() => {
    const el = buttonRef.current;
    if (!el || disabled || isLoading) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || isReducedMotion) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Custom properties for spotlight
        if (spotlight) {
          el.style.setProperty('--spotlight-x', `${xPercent.toFixed(1)}%`);
          el.style.setProperty('--spotlight-y', `${yPercent.toFixed(1)}%`);
          el.style.setProperty('--spotlight-opacity', '1');
        }

        // Custom properties for 3D tilt
        if (tilt) {
          const tiltX = ((yPercent - 50) / 50) * -tiltMaxAngle;
          const tiltY = ((xPercent - 50) / 50) * tiltMaxAngle;
          el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
          el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        }

        // Custom properties for magnetic drag
        if (magnetic) {
          const magX = (x - rect.width / 2) * magneticStrength;
          const magY = (y - rect.height / 2) * magneticStrength;
          el.style.setProperty('--magnetic-x', `${magX.toFixed(1)}px`);
          el.style.setProperty('--magnetic-y', `${magY.toFixed(1)}px`);
        }
      });
    };

    const handlePointerLeave = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--spotlight-opacity', '0');
        el.style.setProperty('--magnetic-x', '0px');
        el.style.setProperty('--magnetic-y', '0px');
      });
    };

    el.addEventListener('pointermove', handlePointerMove, { passive: true });
    el.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [disabled, isLoading, spotlight, tilt, tiltMaxAngle, magnetic, magneticStrength]);

  // Handle tactile mobile haptics & click trigger
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    if (onClick) onClick(e);
  };

  // Base and variant specific CSS classes
  const baseClasses = 'relative inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl select-none select-none text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform-style-preserve-3d';
  
  // Tactical size scales
  const sizeClasses = {
    xs: 'h-7 px-2.5 text-[10px] gap-1 rounded-lg',
    sm: 'h-8.5 px-3.5 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-xs gap-1.5 rounded-xl',
    lg: 'h-11.5 px-5 text-sm gap-2 rounded-xl',
    xl: 'h-13 px-6 text-base gap-2 rounded-2xl',
  };

  // Visual variants conforming with design-system
  const variantClasses = {
    primary: 'btn-3d-primary text-white',
    gold: 'btn-3d-gold text-slate-950 font-black',
    secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 active:scale-98',
    outline: 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 active:scale-98',
    ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600 active:scale-98 transition-colors',
    destructive: 'bg-rose-600 hover:bg-rose-700 active:scale-98 text-white shadow-2xs hover:shadow-xs shadow-rose-600/10',
  };

  return (
    <button
      ref={buttonRef}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={`
        ${baseClasses} 
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        ${spotlight ? 'spotlight-surface' : ''} 
        ${tilt ? 'tilt-card-3d' : ''} 
        ${magnetic ? 'magnetic-target' : ''} 
        ${className}
      `}
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
      {/* Dynamic pointer tracking spotlight layer inside the button */}
      {spotlight && (
        <span 
          className="absolute inset-0 pointer-events-none rounded-inherit bg-[radial-gradient(150px_circle_at_var(--spotlight-x,50%)_var(--spotlight-y,50%),rgba(255,255,255,0.22),transparent_60%)] transition-opacity duration-200" 
          style={{ opacity: 'var(--spotlight-opacity, 0)' }}
        />
      )}

      {/* Button content loader/label */}
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{children ? children : ''}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          {icon && iconPosition === 'start' && (
            <span className="transition-transform duration-150 group-hover:translate-x-[-1px]">
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'end' && (
            <span className="transition-transform duration-150 group-hover:translate-x-[1px]">
              {icon}
            </span>
          )}
        </span>
      )}
    </button>
  );
};
