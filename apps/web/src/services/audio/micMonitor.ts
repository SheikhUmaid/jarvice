import { logActivity } from '../../store/activity';
import { useDevices } from '../../store/devices';
import { AUDIO_BANDS, audioSignal } from '../../utils/signal';

const MIN_HZ = 60;
const MAX_HZ = 8000;

/**
 * Microphone level/spectrum analyser (Web Audio). Audio is analysed in memory only: it is never
 * recorded, stored, sent anywhere or routed to the speakers. Speech recognition arrives in M3.
 */
class MicMonitor {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private timeData: Float32Array<ArrayBuffer> | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private frame = 0;
  private pending: Promise<void> | null = null;

  get active(): boolean {
    return this.stream != null;
  }

  start(): Promise<void> {
    if (this.stream) return Promise.resolve();
    if (this.pending) return this.pending;
    const devices = useDevices.getState();
    if (!navigator.mediaDevices?.getUserMedia) {
      devices.setMic('unavailable', {
        error: 'Microphone access needs a secure context (https or localhost).',
      });
      return Promise.resolve();
    }
    devices.setMic('requesting');
    this.pending = this.open().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async open(): Promise<void> {
    const devices = useDevices.getState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      // Analysis only: the source is never connected to context.destination.
      context.createMediaStreamSource(stream).connect(analyser);
      this.stream = stream;
      this.context = context;
      this.analyser = analyser;
      this.timeData = new Float32Array(analyser.fftSize);
      this.freqData = new Uint8Array(analyser.frequencyBinCount);
      const track = stream.getAudioTracks()[0];
      track?.addEventListener('ended', () => this.stop('Microphone disconnected'));
      devices.setMic('live', { label: track?.label || null });
      logActivity('device', 'Microphone live', {
        level: 'success',
        detail: track?.label || undefined,
      });
      this.frame = requestAnimationFrame(this.loop);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        devices.setMic('denied', { error: 'Microphone permission was denied.' });
        logActivity('device', 'Microphone permission denied', { level: 'warn' });
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        devices.setMic('unavailable', { error: 'No microphone was found.' });
        logActivity('device', 'No microphone found', { level: 'warn' });
      } else {
        const message = error instanceof Error ? error.message : 'The microphone failed to start.';
        devices.setMic('error', { error: message });
        logActivity('device', 'Microphone error', { level: 'error', detail: message });
      }
    }
  }

  /** Stops capture and releases the device. Pass a reason when stopping because of a failure. */
  stop(reason?: string): void {
    cancelAnimationFrame(this.frame);
    const wasActive = this.stream != null;
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.stream = null;
    this.context = null;
    this.analyser = null;
    audioSignal.mic = 0;
    audioSignal.micDb = Number.NEGATIVE_INFINITY;
    audioSignal.bands.fill(0);
    useDevices.getState().setMic(reason ? 'error' : 'off', { error: reason ?? null });
    if (wasActive)
      logActivity('device', reason ?? 'Microphone off', { level: reason ? 'warn' : 'info' });
  }

  private loop = () => {
    const { analyser, timeData, freqData, context } = this;
    if (!analyser || !timeData || !freqData || !context) return;

    analyser.getFloatTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = timeData[i] ?? 0;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const db = rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY;
    // −58 dBFS (room tone) → 0 … −12 dBFS (loud speech) → 1
    const level = Math.min(1, Math.max(0, (db + 58) / 46));
    audioSignal.mic = level > audioSignal.mic ? level : audioSignal.mic * 0.9 + level * 0.1;
    audioSignal.micDb = db;

    analyser.getByteFrequencyData(freqData);
    const nyquist = context.sampleRate / 2;
    const bins = freqData.length;
    for (let band = 0; band < AUDIO_BANDS; band++) {
      const lo = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, band / AUDIO_BANDS);
      const hi = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, (band + 1) / AUDIO_BANDS);
      const start = Math.floor((lo / nyquist) * bins);
      const end = Math.max(start + 1, Math.floor((hi / nyquist) * bins));
      let peak = 0;
      for (let i = start; i < end && i < bins; i++) peak = Math.max(peak, freqData[i] ?? 0);
      audioSignal.bands[band] = peak / 255;
    }
    this.frame = requestAnimationFrame(this.loop);
  };
}

export const micMonitor = new MicMonitor();
