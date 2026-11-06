/** Window event asking the command deck to focus its input (fired by the `/` hotkey). */
export const FOCUS_COMMAND_EVENT = 'jarvis:focus-command';

export function focusCommandInput(): void {
  window.dispatchEvent(new Event(FOCUS_COMMAND_EVENT));
}
