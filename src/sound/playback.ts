/**
 * WELCOME TO PLAYBACK
 * 
 * This is the main code that "schedules" stuff to play. 
 * The stuff doesn't actually play here, it goes to renderer.ts (browser level audio)
 * This is just responsible for triggering notes, in the pianoRoll.
 * TODO: Need to add a new section (new file maybe?) for pattern-level playback.
 */
import { Pattern } from '../core/pattern';
import { Note } from '../core/note';
import { context } from '../core/context';
import { AudioManager, audioManager} from './renderer';

/** Hooks that consumers can implement to receive playback lifecycle events. */
export interface PlaybackListener {
  onPlay?(): void;
  onStop?(): void;
  onTick?(tickPosition: number, elapsedMs: number): void;
}

/** Tunable playback parameters shared across scheduling and visualization. */
export interface PatternConfig {
  bpm: number;
  netVolume: number;
  ticksPerBeat: number;
  gridRowHeight: number;
  referenceRow: number;
  referenceFrequency: number;
}

/** Manager for actual playback. 
 * 
 * Higher level than audio manager, converts ticks to ms based on BPM, y to frequencies, etc */
export class PlaybackController {
  private readonly listeners = new Set<PlaybackListener>();
  private pattern: Pattern | null = null;
  private isPlaying = false;
  private playbackStartMs = 0;
  private animationFrameId: number | null = null;
  private scheduledNoteHandles: number[] = [];
  private currentTick = 0;
  private config: PatternConfig;

  /** Create a controller with an AudioManager and optional config overrides. */
  constructor(private readonly audio: AudioManager, config?: Partial<PatternConfig>) {
    this.config = {
      bpm: 60,
      netVolume: 0.4,
      ticksPerBeat: 480,
      gridRowHeight: 20,
      referenceRow: 30,
      referenceFrequency: 440,
      ...config
    };
  }

  /** Select the pattern that will supply notes for playback. */
  public setPattern(pattern: Pattern | null): void { // TODO: nonfunctional for now
    this.pattern = pattern;
    if (!this.isPlaying) {
      this.currentTick = 0;
      this.notifyTick(0, 0);
    }
  }

  /** Update playback configuration such as BPM or tick resolution. */
  public setConfig(config: Partial<PatternConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Begin playback of the current pattern if available. */
  async play(): Promise<void> {
    if (this.isPlaying || !this.pattern) return;
    await this.audio.init();
    this.isPlaying = true;
    this.playbackStartMs = performance.now();
    this.currentTick = 0;
    this.notifyPlay();
    this.schedulePatternNotes();
    this.requestNextTick();
  }

  /** Stop playback, clear scheduled work, and notify listeners. */
  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.cancelTickLoop();
    this.clearScheduledNotes();
    this.currentTick = 0;
    this.notifyStop();
  }

  /** Toggle to switch between play and stop states. */
  public togglePlay(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      void this.play();
    }
  }

  /** Convert ticks to milliseconds using the current BPM settings. */
  public ticksToMs(ticks: number): number {
    const beatDurationMs = 60000 / this.config.bpm;
    const ticksPerMs = this.config.ticksPerBeat / beatDurationMs;
    return ticks / ticksPerMs;
  }

  /** Convert milliseconds to ticks using the current BPM settings. */
  public msToTicks(ms: number): number {
    const beatDurationMs = 60000 / this.config.bpm;
    const ticksPerMs = this.config.ticksPerBeat / beatDurationMs;
    return Math.floor(ms * ticksPerMs);
  }

  /** Determine the pattern's total duration in milliseconds. */
  public patternDurationMs(pattern: Pattern): number {
    let maxTick = 0;
    for (const note of pattern.notes) {
      const state = note.state;
      maxTick = Math.max(maxTick, state.x + state.length);
    }
    return this.ticksToMs(maxTick);
  }

  /** Map a vertical grid position to an oscillator frequency. */ // TODO: Replace with ToneMap
  public yToFrequency(y: number): number {
    const row = Math.floor(y / this.config.gridRowHeight);
    const semitoneOffset = this.config.referenceRow - row;
    return this.config.referenceFrequency * Math.pow(2, semitoneOffset / 12);
  }

// INTERNAL/PRIVATE FUNCTIONS

  /** Schedule note playback using window timers based on note positions. 
   * 
   * This notably triggers the actual playTones based on each note value factored through ticksToMs:
   * 
   * In other words: All note "actualization" logic is stored here!!!
   * 
   * TODO: Make note actualization its own function?
  */
  private schedulePatternNotes(): void {
    if (!this.pattern) return;
    this.clearScheduledNotes();

    for (const note of this.pattern.notes) {
      const state = note.state;
      const startMs = this.ticksToMs(state.x);
      const durationMs = this.ticksToMs(state.length);
      const instrument = context.song.instruments.get(state.instrumentId) ?? null;
      const timeoutId = window.setTimeout(() => { // Probably replace with a dedicated actualization function?
        const frequency = this.yToFrequency(state.y);
        void this.audio.playNote({
          frequency,
          durationMs,
          volume: this.config.netVolume,
          velocity: state.velocity,
          instrument
        });
      }, startMs);
      this.scheduledNoteHandles.push(timeoutId);
    }
  }

  /** Clear all queued note timeouts to avoid dangling callbacks. Merely a cleanup function */
  private clearScheduledNotes(): void {
    for (const handle of this.scheduledNoteHandles) {
      window.clearTimeout(handle);
    }
    this.scheduledNoteHandles.length = 0;
  }

  /** Queue the next animation frame tick update; this invokes tickLoop */
  private requestNextTick(): void {
    this.animationFrameId = window.requestAnimationFrame(() => this.tickLoop());
  }

  /** advance the internal tick counter, notify listeners, and detect playback completion */
  private tickLoop(): void {
    if (!this.isPlaying) return; // if stopped, kill instantly.
    const elapsedMs = performance.now() - this.playbackStartMs;
    this.currentTick = this.msToTicks(elapsedMs);
    this.notifyTick(this.currentTick, elapsedMs);

    const patternDuration = this.pattern ? this.patternDurationMs(this.pattern) : 0;
    if (patternDuration > 0 && elapsedMs >= patternDuration) {
      this.stop();
      return;
    }

    this.requestNextTick();
  }

  /** Cancel the animation frame loop to prevent further tick callbacks. */
  private cancelTickLoop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

// SUBSCRIBER/LISTENER FUNCS

  /** Register a listener for playback events and return an unsubscribe handle. */
  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /** Notify listeners that playback has started. */
  private notifyPlay(): void {
    for (const listener of this.listeners) {
      listener.onPlay?.();
    }
  }

  /** Notify listeners that playback has stopped. */
  private notifyStop(): void {
    for (const listener of this.listeners) {
      listener.onStop?.();
    }
  }

  /** Notify listeners of the latest tick position during playback. */
  private notifyTick(tickPosition: number, elapsedMs: number): void {
    for (const listener of this.listeners) {
      listener.onTick?.(tickPosition, elapsedMs);
    }
  }


}

export const playbackController = new PlaybackController(audioManager);
