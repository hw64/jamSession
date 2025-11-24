/**
 * CONTEXT
 * 
 * This context provides a singleton (sort of) class that other classes can easily access for common-to-need stuff.
 * This includes things like the entire song object from which everything else song-based can be accessed.
 * Or the currently focused pattern in the editor, or other relevant UI things.
 * There are also major subscribables here for global events of importance.
 * TODO: More stuff should probably be moved here despite what my paid programming consultant based in openAI advises me.
 */
import { Song } from './song';
import { Pattern } from './pattern';
import { PianoRoll } from '../graphics/pianoRoll';
import { ToolBar } from '../graphics/toolBar';
import { PatternView } from '../graphics/patternView';

export class AppContext {
  song: Song;
  currentPattern: Pattern;
  private patternListeners = new Set<(pattern: Pattern) => void>();

  constructor(song: Song = new Song()) {
    this.song = song;
    this.currentPattern = this.ensurePrimaryPattern(song);
  }

  /**
   * Set the song to something else.
   * @param next The song object to switch focus to.
   */
  setSong(next: Song) {
    this.song = next;
    this.setCurrentPattern(this.ensurePrimaryPattern(next));
  }

  setCurrentPattern(pattern: Pattern) {
    this.currentPattern = pattern;
    this.patternListeners.forEach((cb) => cb(pattern));
  }

  onPatternChange(cb: (pattern: Pattern) => void): () => void {
    this.patternListeners.add(cb);
    return () => this.patternListeners.delete(cb);
  }

  private ensurePrimaryPattern(song: Song): Pattern {
    const existing = song.patterns.get(0);
    if (existing) return existing;
    const created = new Pattern();
    song.patterns.set(0, created);
    return created;
  }
}

export const context = new AppContext();
