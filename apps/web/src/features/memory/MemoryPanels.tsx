import { HolographicPanel, toneStyle } from '@jarvis/ui';
import { History, Sparkles } from 'lucide-react';
import { SampleBadge, StatusDot } from '../../components/Atoms';
import { useConversation } from '../../store/conversation';
import { formatClock } from '../../utils/format';
import { SAMPLE_CONVERSATIONS, SAMPLE_MEMORIES } from './samples';

/** Conversation history: the live session (real) plus sample archive entries until Milestone 9. */
export function ConversationHistoryPanel() {
  const startedAt = useConversation((state) => state.sessionStartedAt);
  const count = useConversation((state) => state.messages.length);
  return (
    <HolographicPanel
      title="Conversations"
      icon={<History size={12} className="text-holo-300" />}
      code="HIST"
      padded={false}
    >
      <ul className="divide-y divide-holo-400/8">
        <li className="flex items-center gap-2.5 px-3 py-2">
          <StatusDot pulse />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-holo-50">Current session</p>
            <p className="font-mono text-[10px] text-holo-300/60">
              since {formatClock(new Date(startedAt))} · {count} messages
            </p>
          </div>
          <span className="holo-chip">Live</span>
        </li>
        <li className="flex items-center justify-between px-3 pb-1 pt-2">
          <span className="holo-label">Archive</span>
          <SampleBadge />
        </li>
        {SAMPLE_CONVERSATIONS.map((conversation) => (
          <li key={conversation.id} className="flex items-center gap-2.5 px-3 py-2 opacity-55">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-holo-700" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-holo-100">{conversation.title}</p>
              <p className="font-mono text-[10px] text-holo-300/60">
                {conversation.daysAgo} d ago · {conversation.messages} messages
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-holo-400/8 px-3 py-2 text-[12px] leading-snug text-holo-300/55">
        Persistent history arrives with the SQLite memory engine in Milestone 9.
      </p>
    </HolographicPanel>
  );
}

const KIND_TONE = { preference: 'cyan', fact: 'ice', project: 'ok', command: 'amber' } as const;

/** Saved memories: sample entries until the memory engine ships. */
export function SavedMemoriesPanel() {
  return (
    <HolographicPanel
      title="Saved memories"
      icon={<Sparkles size={12} className="text-holo-300" />}
      padded={false}
      actions={<SampleBadge />}
    >
      <ul className="divide-y divide-holo-400/8">
        {SAMPLE_MEMORIES.map((memory) => (
          <li key={memory.id} className="flex items-start gap-2.5 px-3 py-2 opacity-60">
            <span
              className="holo-chip mt-0.5 w-[5.5rem] shrink-0 justify-center"
              style={toneStyle(KIND_TONE[memory.kind])}
            >
              {memory.kind}
            </span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-holo-100">{memory.text}</p>
          </li>
        ))}
      </ul>
      <p className="border-t border-holo-400/8 px-3 py-2 text-[12px] leading-snug text-holo-300/55">
        Milestone 9 adds real, editable memories. Sensitive details are never saved silently.
      </p>
    </HolographicPanel>
  );
}
