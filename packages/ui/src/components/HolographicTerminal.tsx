import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { toneStyle, type Tone } from '../tokens';
import { clamp, cx } from '../utils';
import { HolographicText } from './HolographicText';

export type TerminalLineKind = 'input' | 'output' | 'system' | 'error' | 'success' | 'muted';

export interface TerminalLine {
  id: string | number;
  kind: TerminalLineKind;
  text: string;
}

export interface HolographicTerminalProps {
  lines: readonly TerminalLine[];
  /** Enables the input row. Commands are trimmed and never empty. */
  onSubmit?: (command: string) => void;
  prompt?: string;
  busy?: boolean;
  placeholder?: string;
  /** Type out the newest output line. */
  typewriter?: boolean;
  tone?: Tone;
  className?: string;
  inputLabel?: string;
  autoFocus?: boolean;
}

/** Highlights a command line: command word, --flags, "strings" and numbers. */
function highlight(text: string): ReactNode[] {
  const tokens = text.match(/"[^"]*"?|'[^']*'?|\s+|[^\s]+/g) ?? [];
  let seenCommand = false;
  return tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return token;
    let className = '';
    if (!seenCommand) {
      className = 'holo-tok-cmd';
      seenCommand = true;
    } else if (/^--?[\w-]+/.test(token)) className = 'holo-tok-flag';
    else if (/^["']/.test(token)) className = 'holo-tok-str';
    else if (/^-?\d+(\.\d+)?$/.test(token)) className = 'holo-tok-num';
    return (
      <span key={index} className={className || undefined}>
        {token}
      </span>
    );
  });
}

const TerminalRow = memo(function TerminalRow({
  line,
  prompt,
  animate,
}: {
  line: TerminalLine;
  prompt: string;
  animate: boolean;
}) {
  return (
    <div className="holo-terminal-row" data-kind={line.kind}>
      {line.kind === 'input' ? (
        <>
          <span className="holo-terminal-prompt">{prompt} </span>
          {highlight(line.text)}
        </>
      ) : animate ? (
        <HolographicText
          text={line.text}
          effect="type"
          duration={clamp(line.text.length * 7, 120, 900)}
        />
      ) : (
        line.text
      )}
    </div>
  );
});

/** Terminal with history (↑/↓), syntax highlighting, auto-scroll and a typewriter for output. */
export function HolographicTerminal({
  lines,
  onSubmit,
  prompt = '›',
  busy = false,
  placeholder,
  typewriter = true,
  tone = 'cyan',
  className,
  inputLabel = 'Terminal command',
  autoFocus = false,
}: HolographicTerminalProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const draft = useRef('');

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [lines, busy]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = value.trim();
    if (!command || !onSubmit) return;
    history.current = [...history.current.filter((entry) => entry !== command), command].slice(
      -100,
    );
    historyIndex.current = -1;
    draft.current = '';
    stickToBottom.current = true;
    setValue('');
    onSubmit(command);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const entries = history.current;
    if (event.key === 'ArrowUp' && entries.length > 0) {
      event.preventDefault();
      if (historyIndex.current === -1) {
        draft.current = value;
        historyIndex.current = entries.length - 1;
      } else {
        historyIndex.current = Math.max(0, historyIndex.current - 1);
      }
      setValue(entries[historyIndex.current] ?? '');
    } else if (event.key === 'ArrowDown' && historyIndex.current !== -1) {
      event.preventDefault();
      const next = historyIndex.current + 1;
      if (next >= entries.length) {
        historyIndex.current = -1;
        setValue(draft.current);
      } else {
        historyIndex.current = next;
        setValue(entries[next] ?? '');
      }
    }
  };

  const lastId = lines.at(-1)?.id;

  return (
    <div
      className={cx('holo-terminal flex h-full min-h-0 flex-col', className)}
      style={toneStyle(tone)}
      onMouseUp={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
    >
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="holo-terminal-log min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          const log = event.currentTarget;
          stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
        }}
      >
        {lines.map((line) => (
          <TerminalRow
            key={line.id}
            line={line}
            prompt={prompt}
            animate={typewriter && line.id === lastId && line.kind !== 'input'}
          />
        ))}
        {busy && (
          <div className="holo-terminal-row flex items-center gap-2" data-kind="system">
            <span aria-hidden className="holo-btn-spinner" /> working…
          </div>
        )}
      </div>
      {onSubmit && (
        <form className="holo-terminal-input" onSubmit={submit}>
          <span className="holo-terminal-prompt">{prompt}</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label={inputLabel}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoFocus={autoFocus}
          />
        </form>
      )}
    </div>
  );
}
