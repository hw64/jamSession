/** Data associated with a note.
 *
 * A note is purely a "y" number associated with a tone and an "x" number associated with time (ticks).
 * There's also an instrument ID attached to it that playback.ts will eventually trigger.
 * TODO: NoteState is a gross leftover from when graphical and data wasn't separate. Probably just make it a class ffs.
 * */
export interface NoteState {
  /** The ID of the note in this pattern. */
  id: number;
  /** horizontal position in ticks */
  x: number;
  /** vertical position in tones. NTS: Called "y" because tones may want mapping. */
  y: number;
  /** length in ticks */
  length: number;
  /** instrument ID */
  instrumentId: number;
  velocity: number;
  /** creator ID */
  creatorId: number;
  /** purely visual?? */
  height: number;
  fill?: string;
}

export interface NoteCreateOptions {
  snapX?: number;
  snapY?: number;
}

export class Note {
  public state: NoteState;

  private constructor(state: NoteState) {
    this.state = { ...state, fill: state.fill ?? '#accfeeff' };
  }

  static create(state: NoteState): Note {
    return new Note(state);
  }

  toJSON(): NoteState {
    return { ...this.state };
  }

  delete(): void {
    // no-op for pure data; visual deletion handled elsewhere
  }

  update(partial: Partial<NoteState>): void {
    this.state = { ...this.state, ...partial };
    if (this.state.fill === undefined) {
      this.state.fill = 'white';
    }
  }
}
