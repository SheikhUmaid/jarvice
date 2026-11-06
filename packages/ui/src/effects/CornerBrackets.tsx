import { cx } from '../utils';

interface CornerBracketsProps {
  /** Bracket arm length in px. */
  size?: number;
  /** Offset from the edge in px (negative sits on top of a 1px border). */
  inset?: number;
  className?: string;
}

/** Four L-shaped corner accents. Inherits colour from the parent's `--tone`. */
export function CornerBrackets({ size = 10, inset = -1, className }: CornerBracketsProps) {
  const arm = { width: size, height: size };
  return (
    <span aria-hidden className={cx('pointer-events-none absolute inset-0', className)}>
      <span className="holo-corner border-l border-t" style={{ ...arm, left: inset, top: inset }} />
      <span
        className="holo-corner border-r border-t"
        style={{ ...arm, right: inset, top: inset }}
      />
      <span
        className="holo-corner border-b border-l"
        style={{ ...arm, left: inset, bottom: inset }}
      />
      <span
        className="holo-corner border-b border-r"
        style={{ ...arm, right: inset, bottom: inset }}
      />
    </span>
  );
}
