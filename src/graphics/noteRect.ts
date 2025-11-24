/**
 * NOTERECT
 * 
 * Note.ts are the raw data, this is just the manifestation/graphical representation in the piano roll.
 * Lots and lots of these are created on the fly whenever the piano roll rebuilds itself.
 * It follows that this contains all the GUI interaction for adjusting notes while not actually being a "true" note.
 * 
 */
import Konva from 'konva';
import { Note, NoteCreateOptions } from '../core/note';
import { context } from '../core/context';
import type { PianoRoll } from './pianoRoll';
import { attachNoteInteractions } from './pianoRoll.input';

export class NoteRect {
  readonly shape: Konva.Rect;
  private readonly snapX: number;
  private readonly snapY: number;

  constructor(
    private readonly layer: Konva.Layer,
    roll: PianoRoll,
    private readonly note: Note,
    snapOptions: NoteCreateOptions,
    noteLengthScrollDivisor: number
  ) {
    this.snapX = snapOptions.snapX ?? 10;
    this.snapY = snapOptions.snapY ?? note.state.height;
    this.shape = this.createRect();
    this.applyState();
    attachNoteInteractions(roll, this.note, this.shape, snapOptions, noteLengthScrollDivisor);
  }

  destroy(): void {
    this.shape.destroy();
  }

  private createRect(): Konva.Rect {
    const rect = new Konva.Rect({
      draggable: true,
      cornerRadius: 2
    });
    this.layer.add(rect);
    this.attachDragHandlers(rect);
    return rect;
  }

  private attachDragHandlers(rect: Konva.Rect): void {
    rect.dragBoundFunc((pos) => {
      const stage = this.layer.getStage();
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) {
        return {
          x: this.snapToGrid(pos.x, this.snapX),
          y: this.snapToGrid(pos.y, this.snapY)
        };
      }

      const absTransform = this.layer.getAbsoluteTransform();
      const inv = absTransform.copy().invert();
      const local = inv.point(pointer);
      const snappedLocal = {
        x: this.snapToGrid(local.x, this.snapX),
        y: this.snapToGrid(local.y, this.snapY)
      };

      const snappedAbs = absTransform.point(snappedLocal);
      return {
        x: snappedAbs.x,
        y: snappedAbs.y
      };
    });

    rect.off('dragend.noteSnap');
    rect.on('dragend.noteSnap', () => {
      const snappedX = this.snapToGrid(rect.x(), this.snapX);
      const snappedY = this.snapToGrid(rect.y(), this.snapY);
      this.note.update({ x: snappedX, y: snappedY });
      this.applyState();
      this.layer.batchDraw();
    });
  }

  private snapToGrid(value: number, step: number): number {
    if (step <= 0) return value;
    return Math.round(value / step) * step;
  }

  private applyState(): void {
    this.shape.x(this.note.state.x);
    this.shape.y(this.note.state.y);
    this.shape.width(this.note.state.length);
    this.shape.height(this.note.state.height);
    const instrumentColor = context.song.instruments.get(this.note.state.instrumentId)?.color;
    const fill = instrumentColor ?? this.note.state.fill ?? 'white';
    this.shape.fill(fill);
    this.layer.batchDraw();
  }
}
