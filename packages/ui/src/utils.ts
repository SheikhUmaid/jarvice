/** Joins truthy class names. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Positive modulo (result always in [0, divisor)). */
export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
