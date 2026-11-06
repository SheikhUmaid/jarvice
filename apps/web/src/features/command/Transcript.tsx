import { HolographicButton, HolographicPanel, cx } from '@jarvis/ui';
import { Trash2 } from 'lucide-react';
import { memo, useLayoutEffect, useRef } from 'react';
import { EmptyState } from '../../components/Atoms';
import { useConversation, type ChatMessage } from '../../store/conversation';
import { formatClock } from '../../utils/format';

const VISIBLE_MESSAGES = 60;

/** The live conversation: user commands and streamed JARVIS responses. */
export function Transcript() {
  const messages = useConversation((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const visible = messages.slice(-VISIBLE_MESSAGES);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && stick.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <HolographicPanel
      title="Conversation"
      code={`${messages.length} MSG`}
      className="max-h-[34vh] min-h-[7.5rem] shrink-0"
      padded={false}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      actions={
        messages.length > 0 ? (
          <HolographicButton
            size="xs"
            variant="ghost"
            iconOnly
            aria-label="Clear conversation"
            title="Clear conversation"
            icon={<Trash2 size={12} />}
            onClick={() => useConversation.getState().clear()}
          />
        ) : null
      }
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation transcript"
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5"
        onScroll={(event) => {
          const element = event.currentTarget;
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
        }}
      >
        {visible.length === 0 ? (
          <EmptyState>
            No messages yet. Type a command below — “help” lists what works today.
          </EmptyState>
        ) : (
          visible.map((message) => <Message key={message.id} message={message} />)
        )}
      </div>
    </HolographicPanel>
  );
}

const Message = memo(function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <article className={cx('flex gap-2.5', isUser && 'opacity-90')}>
      <span
        aria-hidden
        className={cx(
          'mt-[3px] w-14 shrink-0 font-display text-[8.5px] font-semibold tracking-[0.2em]',
          isUser ? 'text-ice/60' : 'text-holo-300',
        )}
      >
        {isUser ? 'YOU' : 'JARVIS'}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cx(
            'whitespace-pre-line break-words text-[14.5px] leading-snug',
            isUser ? 'text-ice/85' : 'text-holo-50',
            message.status === 'error' && 'text-alert',
          )}
        >
          <span className="sr-only">{isUser ? 'You said: ' : 'JARVIS: '}</span>
          {message.text}
          {message.status === 'streaming' && <span aria-hidden className="holo-cursor" />}
        </p>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] text-holo-400/45">
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatClock(new Date(message.createdAt))}
          </time>
          {message.source !== 'text' && message.source !== 'local' && (
            <span>· {message.source}</span>
          )}
          {message.status === 'interrupted' && (
            <span className="text-amber-hud/80">· interrupted</span>
          )}
        </div>
      </div>
    </article>
  );
});
