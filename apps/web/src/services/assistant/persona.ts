import { useSettings } from '../../store/settings';

/** Calm, concise, slightly dry. Never a customer-support voice. */

/** ", <form of address>" when the user has set one (Settings → persona); otherwise nothing. */
export function address(): string {
  const honorific = useSettings.getState().honorific.trim();
  return honorific ? `, ${honorific}` : '';
}

export function greetingForTime(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

let rotation = 0;
/** Rotates through phrasings so repeated commands don't sound canned. */
export function vary<T>(options: readonly T[]): T {
  rotation = (rotation + 1) % 997;
  return options[rotation % options.length] as T;
}

export const REASONING_OFFLINE =
  'That one needs my reasoning core, which links to Claude in Milestone 4. Until then I can switch modes, run diagnostics, tell the time and adjust the display — say “help” for the list.';
