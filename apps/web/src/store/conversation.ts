import { create } from 'zustand';
import { createId } from '../utils/id';

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'streaming' | 'done' | 'interrupted' | 'error';
/** Where a message came from: typed, spoken, a favourite, the local command layer or Claude. */
export type MessageSource = 'text' | 'voice' | 'favourite' | 'local' | 'claude';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  status: MessageStatus;
  source: MessageSource;
}

interface ConversationState {
  sessionStartedAt: number;
  messages: ChatMessage[];
  add(message: Pick<ChatMessage, 'role' | 'text' | 'status' | 'source'>): string;
  append(id: string, delta: string): void;
  finish(id: string, status: MessageStatus): void;
  clear(): void;
}

export const useConversation = create<ConversationState>((set) => ({
  sessionStartedAt: Date.now(),
  messages: [],
  add: (message) => {
    const id = createId('msg');
    set((state) => ({ messages: [...state.messages, { ...message, id, createdAt: Date.now() }] }));
    return id;
  },
  append: (id, delta) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)),
    })),
  finish: (id, status) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, status } : m)),
    })),
  clear: () => set({ messages: [] }),
}));
