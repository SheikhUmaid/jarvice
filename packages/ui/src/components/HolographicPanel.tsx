import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';
import { useId, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { CornerBrackets } from '../effects/CornerBrackets';
import { HOLO_EASE, holoReveal } from '../effects/motion';
import { GLOW_CLASS, toneStyle, type GlowLevel, type Tone } from '../tokens';
import { cx } from '../utils';

interface PanelOwnProps {
  title?: ReactNode;
  /** Small monospace identifier shown on the right of the header (e.g. "SYS-02"). */
  code?: ReactNode;
  /** Replaces the default square marker in the header. */
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: Tone;
  glow?: GlowLevel;
  corners?: boolean;
  scanlines?: boolean;
  /** Animate in with the shared clip reveal. */
  reveal?: boolean;
  padded?: boolean;
  /** Header becomes a disclosure button that collapses the body. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  bodyClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export type HolographicPanelProps = PanelOwnProps &
  Omit<HTMLMotionProps<'section'>, keyof PanelOwnProps>;

/** Glass container with corner brackets, optional header, scanlines and collapse. */
export function HolographicPanel({
  title,
  code,
  icon,
  actions,
  tone = 'cyan',
  glow = 'soft',
  corners = true,
  scanlines = false,
  reveal = true,
  padded = true,
  collapsible = false,
  defaultCollapsed = false,
  className,
  bodyClassName,
  style,
  children,
  ref,
  ...rest
}: HolographicPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const bodyId = useId();
  const hasHeader = title != null || code != null || actions != null || icon != null;

  const heading = (
    <>
      {icon ?? <span aria-hidden className="holo-panel-marker" />}
      {title != null && <span className="min-w-0 truncate">{title}</span>}
      {code != null && <span className="holo-panel-code">{code}</span>}
    </>
  );

  const body = (
    <div id={bodyId} className={cx('relative min-h-0', padded && 'p-3', bodyClassName)}>
      {children}
    </div>
  );

  return (
    <motion.section
      ref={ref}
      {...rest}
      className={cx('holo-panel relative flex min-h-0 flex-col', GLOW_CLASS[glow], className)}
      style={toneStyle(tone, style)}
      variants={holoReveal}
      initial={reveal ? 'hidden' : false}
      animate="visible"
    >
      {corners && <CornerBrackets />}
      {scanlines && <span aria-hidden className="holo-scanlines" />}
      {hasHeader && (
        <header className="holo-panel-header">
          {collapsible ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left uppercase"
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={() => setCollapsed((value) => !value)}
            >
              {heading}
              <Chevron open={!collapsed} />
            </button>
          ) : (
            heading
          )}
          {actions != null && (
            <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </header>
      )}
      {collapsible ? (
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: HOLO_EASE }}
              className="overflow-hidden"
            >
              {body}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        body
      )}
    </motion.section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 10"
      className={cx(
        'ml-1 h-2.5 w-2.5 shrink-0 transition-transform',
        open ? 'rotate-0' : '-rotate-90',
      )}
    >
      <path d="M1.5 3.2 5 6.8l3.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
