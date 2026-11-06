import { audioSignal } from '../../utils/signal';

const VOWEL = /[aeiouy]/i;
const LETTER = /[a-z0-9]/i;
const PAUSE = /[.,;:!?—–]/;

/**
 * Amplitude envelope for JARVIS's speech, derived from the text as it is delivered: vowels open
 * the "mouth", consonants less, punctuation pauses. Browsers don't expose SpeechSynthesis audio,
 * so Milestone 3 will drive this from TTS boundary events in the same way.
 */
export function feedSpeech(chunk: string): void {
  if (!chunk) return;
  let energy = 0;
  for (const char of chunk) {
    if (VOWEL.test(char)) energy += 1;
    else if (LETTER.test(char)) energy += 0.55;
    else if (PAUSE.test(char)) energy -= 0.8;
  }
  const target = Math.max(0, Math.min(1, energy / chunk.length));
  const jitter = 0.75 + Math.random() * 0.25;
  audioSignal.speech = Math.max(
    audioSignal.speech * 0.55,
    target > 0 ? 0.2 + target * 0.8 * jitter : 0,
  );
}

export function silenceSpeech(): void {
  audioSignal.speech = 0;
}
