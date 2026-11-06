import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { toneStyle, type Tone } from '../tokens';
import { cx } from '../utils';

export interface HolographicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: Tone;
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Toggle state. Sets `aria-pressed`; leave undefined for plain action buttons. */
  active?: boolean;
  loading?: boolean;
  /** Keyboard hint rendered after the label. */
  shortcut?: string;
  /** Square button that only shows its icon (provide `aria-label`). */
  iconOnly?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Chamfered holographic button with sheen hover, toggle and loading states. */
export function HolographicButton({
  variant = 'outline',
  size = 'md',
  tone = 'cyan',
  icon,
  iconRight,
  active,
  loading = false,
  shortcut,
  iconOnly = false,
  type = 'button',
  disabled,
  className,
  style,
  children,
  ref,
  ...rest
}: HolographicButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-pressed={active}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-active={active ? '' : undefined}
      className={cx('holo-btn', `holo-btn-${size}`, iconOnly && 'holo-btn-icon', className)}
      style={toneStyle(tone, style)}
      {...rest}
    >
      <span aria-hidden className="holo-btn-fill" />
      <span className="holo-btn-content">
        {loading ? <span aria-hidden className="holo-btn-spinner" /> : icon}
        {children != null && !iconOnly && <span>{children}</span>}
        {iconRight}
        {shortcut && <kbd className="holo-kbd">{shortcut}</kbd>}
      </span>
    </button>
  );
}
