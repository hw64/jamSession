import Konva from 'konva';

/** Data associated with a note. */
export interface NoteState {
  /** The ID of the note in this pattern. */
  id: number;
  /** horizontal position in ticks */
  x: number;
  /** vertical position in tones. NTS: Called "y" because tones may want mapping. */
  y: number;
  /** length in ticks */
  width: number;
  /** purely visual?? */
  height: number;
  fill?: string;
}

export class Note {
  private state: NoteState;
  /** Cached shape data. Temporary. */
  private rect: Konva.Rect | null = null;

  private constructor(private readonly layer: Konva.Layer, state: NoteState) {
    this.state = { ...state, fill: state.fill ?? 'white' };
  }

  static create(layer: Konva.Layer, state: NoteState): Note {
    const note = new Note(layer, state);
    note.getShape(); // ensure it is rendered immediately
    return note;
  }

  toJSON(): NoteState {
    return { ...this.state };
  }

  delete(): void {
    this.rect?.destroy();
    this.rect = null;
  }

  update(partial: Partial<NoteState>): void {
    this.state = { ...this.state, ...partial };
    if (this.state.fill === undefined) {
      this.state.fill = 'white';
    }
    if (this.rect) {
      this.applyStateToRect(this.rect);
      this.layer.batchDraw();
    }
  }

  /** Return the konva rect, creating it if necessary. */
  getShape(): Konva.Rect {
    if (!this.rect) {
      this.rect = this.createRect();
      this.layer.add(this.rect);
    }

    this.applyStateToRect(this.rect);
    this.layer.batchDraw();

    return this.rect;
  }

  private createRect(): Konva.Rect {
    return new Konva.Rect({
      draggable: true,
      cornerRadius: 4
    });
  }

  private applyStateToRect(rect: Konva.Rect): void {
    rect.x(this.state.x);
    rect.y(this.state.y);
    rect.width(this.state.width);
    rect.height(this.state.height);
    rect.fill(this.state.fill ?? 'white');
  }
}
