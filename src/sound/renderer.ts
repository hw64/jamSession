/**
 * RENDERER
 * 
 * This renders the audio.
 * Notably, it makes sure we have an audio context, then plays stuff.
 * Audio is lazy so it will just init context if the per-tone check fails.
 */

import { Pattern } from '../core/pattern';
import { Note } from '../core/note';
import { Instrument } from '../core/instrument'

interface PlayNoteParams {
  frequency: number;
  durationMs: number;
  volume?: number;
  velocity?: number;
  instrument?: Instrument | null | undefined;
}

/** Manages Web Audio initialization and tone playback for simple oscillator notes. */
export class AudioManager {
  private audioCtx: AudioContext | null = null;

  /** Lazily create and resume the AudioContext so the caller can schedule audio work. */
  private async ensureContext(): Promise<AudioContext> {
    if (this.audioCtx) return this.audioCtx;
    const ctx = new AudioContext();
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('AudioContext resume failed:', err);
      throw err;
    }

    this.audioCtx = ctx;
    return ctx;
  }

  /** Explicitly initialize the AudioContext; safe to call multiple times. */
  async init(): Promise<void> {
    if (!this.audioCtx) {
      await this.ensureContext();
    }
  }

  /** Play a single note using instrument-aware playback (waveform + ADSR). */
  async playNote(params: PlayNoteParams): Promise<void> {
    const { frequency, durationMs, volume = 1.0, velocity = 1.0, instrument = null } = params;
    const ctx = await this.ensureContext();
    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const totalDurationSec = durationMs / 1000;
    const adjustedVolume = volume * velocity * 0.4;

    // TIMBRE: Wave and Frequency
    const oscType = instrument?.waveform ?? 'sine';
    osc.type = oscType;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Envelope (simple ADSR)
    const attack = instrument?.attack ?? 0.01;
    const decay = instrument?.decay ?? 0.05;
    const sustainLevel = instrument?.sustain ?? 0.7;
    const release = instrument?.release ?? 0.1;
    const sustainDuration = Math.max(0, totalDurationSec - (attack + decay + release));

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(adjustedVolume, startTime + attack);
    gain.gain.linearRampToValueAtTime(adjustedVolume * sustainLevel, startTime + attack + decay);
    gain.gain.setValueAtTime(adjustedVolume * sustainLevel, startTime + attack + decay + sustainDuration);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + totalDurationSec);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + totalDurationSec + release);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + totalDurationSec + release);
    // clean up once oscillator "ended" event is finished
    osc.addEventListener('ended', () => {
      osc.disconnect();
      gain.disconnect();
    });
  }

  /** Legacy tone playback for quick beeps; delegates to playNote. */
  async playTone(frequency: number, duration: number, volume: number = 1.0, instrument?: Instrument | null): Promise<void> {
    return this.playNote({ frequency, durationMs: duration, volume, instrument });
  }
}

export const audioManager = new AudioManager();
