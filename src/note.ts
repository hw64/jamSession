import Konva from 'konva';
/** The Data associated with a note. Serialized, read from for rendering, etc. */
export interface NoteState { // for whatever dumbass reason interfaces are structs in ts(?)
  /** horizontal position in ticks*/
  x: number;
  /** vertical position in tones. NTS: Called "y" because tones may want mapping. */
  y: number;
  width: number;
  height: number;
  fill?: string;
}

export class Note {
  private readonly rect: Konva.Rect;

  constructor(private readonly layer: Konva.Layer, state: NoteState) {
    this.rect = new Konva.Rect({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      fill: state.fill ?? 'white',
      draggable: true,
      cornerRadius: 4
    });

    this.layer.add(this.rect);
  }

  static create(layer: Konva.Layer, state: NoteState): Note {
    return new Note(layer, state);
  }

  toJSON(): NoteState {
    return {
      x: this.rect.x(),
      y: this.rect.y(),
      width: this.rect.width(),
      height: this.rect.height(),
      fill: this.rect.fill().toString()
    };
  }

  delete(): void {
    this.rect.destroy();
  }
  /** Return the konva rect. */
  getShape(): Konva.Rect {
    return this.rect;
  }
}

