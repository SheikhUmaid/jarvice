import { HolographicPanel, cx, holoItem, holoStagger } from '@jarvis/ui';
import { Activity, Clock, Command, Earth, Layers, Mic, Star, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { submitCommand } from '../../services/assistant/runner';
import { ConversationHistoryPanel, SavedMemoriesPanel } from '../memory/MemoryPanels';

interface Favourite {
  label: string;
  command: string;
  icon: LucideIcon;
}

/** Real, runnable commands (handled by the local command layer). */
const FAVOURITES: readonly Favourite[] = [
  { label: 'Run diagnostics', command: 'run diagnostics', icon: Activity },
  { label: 'What time is it?', command: 'what time is it?', icon: Clock },
  { label: 'Holographic mode', command: 'open holographic mode', icon: Layers },
  { label: 'Show the globe', command: 'show the globe', icon: Earth },
  { label: 'Start listening', command: 'start listening', icon: Mic },
  { label: 'Help', command: 'help', icon: Command },
];

/** Left column of the command centre: history, memories and favourite commands. */
export function LeftPanel({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Conversations, memories and favourite commands"
      className={cx('flex min-h-0 w-full flex-col gap-3 overflow-y-auto [&>*]:shrink-0', className)}
    >
      <FavouritesPanel />
      <ConversationHistoryPanel />
      <SavedMemoriesPanel />
    </aside>
  );
}

function FavouritesPanel() {
  return (
    <HolographicPanel
      title="Favourite commands"
      icon={<Star size={12} className="text-holo-300" />}
      code="FAV"
      padded={false}
    >
      <motion.ul
        className="grid grid-cols-1 gap-px p-1.5"
        variants={holoStagger(0.04, 0.15)}
        initial="hidden"
        animate="visible"
      >
        {FAVOURITES.map(({ label, command, icon: Icon }) => (
          <motion.li key={command} variants={holoItem}>
            <button
              type="button"
              onClick={() => void submitCommand(command, 'favourite')}
              className="group flex w-full items-center gap-2.5 rounded-[2px] px-2 py-1.5 text-left transition-colors hover:bg-holo-400/10 focus-visible:bg-holo-400/10"
            >
              <Icon
                size={14}
                strokeWidth={1.6}
                className="shrink-0 text-holo-400/80 group-hover:text-holo-200"
              />
              <span className="flex-1 truncate text-[14px] font-medium text-holo-100 group-hover:text-white">
                {label}
              </span>
              <span className="font-mono text-[9.5px] text-holo-400/0 transition-colors group-hover:text-holo-400/60">
                run ›
              </span>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </HolographicPanel>
  );
}
