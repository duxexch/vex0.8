import React, { useCallback } from 'react';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { LIMIT } from '../motion/tokens';

export type CardVariant = 'standard' | 'interactive' | 'featured' | 'compact';
export type CardSurface = 'div' | 'button' | 'a';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Subtle pointer-driven 3D tilt (desktop + fine pointer only). */
  tilt?: boolean;
  /** Pointer spotlight lighting following the cursor. */
  spotlight?: boolean;
  /** Fade/translate the card into view when scrolled into the viewport. */
  reveal?: boolean;
  /** Polymorphic surface — button/a keep native keyboard semantics. */
  as?: CardSurface;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

/**
 * Unified Card system (Phase 15–26, 69, 70).
 *
 * - standard:    static content surface (no hover motion — content stability)
 * - interactive: lift on hover, press on active (add onClick / as="button"|"a")
 * - featured:    higher baseline elevation + brand edge
 * - compact:     dense data surface, interactive by default
 *
 * Depth: shadow tokens (--elev-*), tilt bounded by LIMIT.cardTiltMaxDeg,
 * spotlight via CSS variables. Reduced motion: all transforms disabled in CSS;
 * touch/coarse pointers skip pointer tracking in the hook.
 */
export const Card: React.FC<CardProps> = ({
  variant = 'standard',
  tilt = false,
  spotlight = false,
  reveal = false,
  as = 'div',
  href,
  target,
  rel,
  className = '',
  children,
  onClick,
  onKeyDown,
  tabIndex,
  ...props
}) => {
  const interactive = variant === 'interactive' || variant === 'compact' || !!onClick;

  const pointerRef = usePointerInteraction<HTMLDivElement>({
    tilt,
    spotlight,
    magnetic: false,
    tiltMaxAngle: LIMIT.cardTiltMaxDeg,
    disabled: !interactive,
  });

  const revealRef = useScrollReveal<HTMLDivElement>({ disabled: !reveal });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (pointerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      revealRef(node);
    },
    [pointerRef, revealRef]
  );

  const surfaceClasses =
    as === 'button' ? 'w-full text-left cursor-pointer' : as === 'a' ? 'cursor-pointer' : '';

  const classes = [
    'relative block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    variant === 'compact' ? 'p-3.5' : variant === 'featured' ? 'p-5 sm:p-6' : 'p-4 sm:p-5',
    variant === 'featured' ? 'card-featured' : '',
    interactive && !tilt ? 'card-interactive' : '',
    interactive && tilt ? 'card-interactive tilt-card-3d' : '',
    spotlight ? 'spotlight-surface' : '',
    surfaceClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e);
    if (!onClick || as !== 'div') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };

  const a11yProps: React.HTMLAttributes<HTMLElement> = {};
  if (as === 'div' && onClick) {
    a11yProps.role = 'button';
    a11yProps.tabIndex = tabIndex ?? 0;
  }

  const transformStyle: React.CSSProperties | undefined = tilt
    ? {
        transform:
          'perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
      }
    : undefined;

  const Element = as as React.ElementType;

  return (
    <Element
      ref={setRefs}
      className={classes}
      style={transformStyle}
      href={as === 'a' ? href : undefined}
      target={as === 'a' ? target : undefined}
      rel={as === 'a' ? rel : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={as === 'div' ? a11yProps.tabIndex : tabIndex}
      role={as === 'div' ? a11yProps.role : undefined}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Element>
  );
};

export default Card;
