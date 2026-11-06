import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` and aligned to whole seconds for clocks. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let interval = 0;
    const align = window.setTimeout(
      () => {
        setNow(Date.now());
        interval = window.setInterval(() => setNow(Date.now()), intervalMs);
      },
      intervalMs >= 1000 ? 1000 - (Date.now() % 1000) : intervalMs,
    );
    return () => {
      window.clearTimeout(align);
      window.clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}
