/**
 * SERIALIZATION (TEMPORARY)
 * 
 * Make/Interpret a json file in memory. For the actual song.sesh or whatever go to toolBar's save/load buttons.
 */

import { context, AppContext } from './context';
import { Song } from './song';
import { Pattern } from './pattern';
import { Note, NoteState } from './note';
import { Instrument } from './instrument';

export interface SerializedSong {
  bpm: number;
  layout: number[][];
  instruments: Array<SerializedInstrument>;
  patterns: Array<SerializedPattern>;
}

export interface SerializedInstrument {
  id: number;
  name: string;
  color: string;
  waveform: OscillatorType;
  volume: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SerializedPattern {
  id: number;
  length: number;
  notes: NoteState[];
}

/** convert current song (or provided song) into a JSON string */
export function serializeSong(song: Song = context.song): string {
  const payload: SerializedSong = {
    bpm: song.bpm,
    layout: song.layout,
    instruments: Array.from(song.instruments.entries()).map(([id, inst]) => ({
      id,
      name: inst.name,
      color: inst.color,
      waveform: inst.waveform,
      volume: inst.volume,
      attack: inst.attack,
      decay: inst.decay,
      sustain: inst.sustain,
      release: inst.release
    })),
    patterns: Array.from(song.patterns.entries()).map(([id, pattern]) => ({
      id,
      length: pattern.length,
      notes: pattern.notes.map((n) => n.toJSON())
    }))
  };
  return JSON.stringify(payload);
}

/** load a song from JSON into the provided context's existing song instance (defaults to global context) */
export function deserializeSong(json: string, appCtx: AppContext = context): Song {
  const parsed = safeParse(json);
  const song = appCtx.song;
  song.patterns.clear();
  song.instruments.clear();

  song.bpm = parsed.bpm ?? song.bpm;
  song.layout = Array.isArray(parsed.layout) ? parsed.layout : [];

  for (const inst of parsed.instruments ?? []) {
    const instrument = new Instrument({
      name: inst.name ?? '',
      color: inst.color ?? '#ffffff',
      waveform: inst.waveform ?? 'sine',
      volume: inst.volume ?? 1.0,
      attack: inst.attack ?? 0.01,
      decay: inst.decay ?? 0.05,
      sustain: inst.sustain ?? 0.7,
      release: inst.release ?? 0.1
    });
    song.instruments.set(inst.id ?? 0, instrument);
  }

  for (const pat of parsed.patterns ?? []) {
    const pattern = new Pattern();
    pattern.length = pat.length ?? pattern.length;
    pattern.notes = (pat.notes ?? []).map((state) =>
      Note.create({
        id: state.id,
        x: state.x,
        y: state.y,
        length: state.length,
        height: state.height,
        instrumentId: state.instrumentId,
        velocity: state.velocity,
        creatorId: state.creatorId,
        fill: state.fill ?? '#ffffff'
      })
    );
    song.patterns.set(pat.id ?? pattern.id, pattern);
  }

  const nextPattern = song.patterns.get(0) ?? song.patterns.values().next().value ?? new Pattern();
  if (!song.patterns.has(nextPattern.id)) {
    song.patterns.set(nextPattern.id, nextPattern);
  }
  appCtx.setCurrentPattern(nextPattern);
  return song;
}
// attempt parse with error handling
function safeParse(json: string): SerializedSong {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      return parsed as SerializedSong;
    }
  } catch (err) {
    console.warn('JSON FAILED!!!!:', err);
  }
  return { bpm: 120, layout: [], instruments: [], patterns: [] };
}
