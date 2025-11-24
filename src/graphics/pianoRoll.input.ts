/** PIANO ROLL INPUT FUNCTIONS
 * Input helpers for pianoRoll object and its layer.
 * - The attachNoteInteractions function merely takes a note and provides its konva element with interactables.
 * - These features include deletion, dragging, scrolling on the note to change length.
 * TODO: Lots of ugly massive argument files from back when there wasn't a global context. Annihilate them.
 */
import Konva from 'konva';
import { Note, NoteCreateOptions } from '../core/note';
import type { PianoRoll } from './pianoRoll';
import { playbackController } from '../sound/playback';
import { audioManager } from '../sound/renderer';
import { context } from '../core/context';

export function attachNoteInteractions(
  roll: PianoRoll,
  note: Note,
  shape: Konva.Rect,
  snap: NoteCreateOptions,
  noteLengthScrollDivisor: number
): void {
  attachNoteLengthScrollHandler(note, shape, snap, noteLengthScrollDivisor);
  attachNoteDeleteHandler(roll, note, shape);
  attachNoteDragPlayTone(note, shape);
}

// keep the helpers free functions…
export function attachNoteLengthScrollHandler(note: Note, shape: Konva.Rect, snapOptions: NoteCreateOptions, noteLengthScrollDivisor: number): void {
    shape.off('wheel.noteLength');
    shape.on('wheel.noteLength', (evt: Konva.KonvaEventObject<WheelEvent>) => {
      evt.evt.preventDefault();
      evt.evt.stopPropagation();
      evt.cancelBubble = true;
      const scrolly = evt.evt.deltaY / noteLengthScrollDivisor;
      const direction = scrolly < 0 ? 1 : -1;
      const step = snapOptions.snapX ?? 1;
      const magnitude = Math.max(1, Math.round(Math.abs(scrolly)));
      const delta = direction * magnitude * step;
      const minLength = step;
      const nextLength = Math.max(minLength, note.state.length + delta);
      if (nextLength === note.state.length) return;
      note.update({ length: nextLength });
      shape.width(note.state.length);
      const layer = shape.getLayer();
      layer?.batchDraw();
    });
  }

export function attachNoteDeleteHandler(roll: PianoRoll, note: Note, shape: Konva.Rect): void {
      shape.off('contextmenu.noteDelete');
      shape.on('contextmenu.noteDelete', (evt: Konva.KonvaEventObject<MouseEvent>) => {
        evt.evt.preventDefault();
        evt.evt.stopPropagation();
        roll.removeNote(note);
      });
    }
  
export function attachNoteDragPlayTone(note: Note, shape: Konva.Rect): void {
  let dragStartY = shape.y();
  let lastPingY = dragStartY;

  shape.off('dragstart.playTone');
  shape.on('dragstart.playTone', () => {
    dragStartY = shape.y();
    lastPingY = dragStartY;
  });

  shape.off('dragmove.playTone');
  shape.on('dragmove.playTone', () => {
    const currentY = shape.y();
    if (currentY === lastPingY) return;
    lastPingY = currentY;
    const freq = playbackController.yToFrequency(currentY);
    const instrument = context.song.instruments.get(note.state.instrumentId) ?? null;
    void audioManager.playTone(freq, 120, 1.0, instrument);
  });

  shape.off('dragend.playTone');
  shape.on('dragend.playTone', () => {
    const newY = shape.y();
    if (newY === dragStartY) return;
    const freq = playbackController.yToFrequency(newY);
    const instrument = context.song.instruments.get(note.state.instrumentId) ?? null;
    void audioManager.playTone(freq, 120, 1.0, instrument);
  });
}

export function registerPianoRollWheelInput(
  stage: Konva.Stage,
  pianoRollLayer: Konva.Layer,
  pianoRoll: PianoRoll,
  mouseWheelZoomSensitivity: number,
  trackpadPinchZoomSensitivity: number
): void {
  stage.on('wheel.pianoRollZoom', (evt: Konva.KonvaEventObject<WheelEvent>) => {
    const targetLayer = typeof evt.target.getLayer === 'function' ? evt.target.getLayer() : null;
    if (targetLayer && targetLayer !== pianoRollLayer) return;
    if (evt.target instanceof Konva.Rect) return;

    evt.evt.preventDefault();
    evt.evt.stopPropagation();

    const raw = evt.evt;
    const deltaModeMultiplier =
      raw.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 :
      raw.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight :
      1;

    const scaledDeltaX = raw.deltaX * deltaModeMultiplier;
    const scaledDeltaY = raw.deltaY * deltaModeMultiplier;

    // Trackpad pinch (ctrlKey true on macOS browsers) zooms both axes uniformly.
    if (raw.ctrlKey) {
      const pinchDelta = scaledDeltaY * trackpadPinchZoomSensitivity;
      if (pinchDelta !== 0) {
        pianoRoll.incrementZoom(pinchDelta, pinchDelta);
      }
      return;
    }

    const deltaX = scaledDeltaX * mouseWheelZoomSensitivity;
    const deltaY = scaledDeltaY * mouseWheelZoomSensitivity;
    if (deltaX === 0 && deltaY === 0) return;

    pianoRoll.incrementPan(deltaX, deltaY);
  });
}

export function registerPianoRollClickToAddNote(
  stage: Konva.Stage,
  pianoRollLayer: Konva.Layer,
  pianoRoll: PianoRoll,
  snapOptions: NoteCreateOptions,
  gridRowHeight: number,
  noteLengthScrollDivisor: number,
  getSelectedInstrumentId?: () => number | null
): void {
  stage.on('click.pianoRollAddNote', (e) => {
    if (e.evt.button !== 0) return; // only handle left-clicks
    if (e.target !== stage) return; // Ignore clicks on existing shapes
    let pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    pointerPos = pianoRoll.screenToRoll(pointerPos);
    if (!pointerPos) return;

    const snapX = snapOptions.snapX ?? 4;
    const snappedY = Math.floor(pointerPos.y / gridRowHeight) * gridRowHeight;
    const snappedX = Math.round(pointerPos.x / snapX) * snapX;
    const instrumentId = getSelectedInstrumentId?.() ?? 0;
    const instrument = context.song.instruments.get(instrumentId) ?? null;

    const newNote = Note.create({
      id: pianoRoll.focusedPattern.notes.length,
      x: snappedX,
      y: snappedY,
      length: 60,
      height: gridRowHeight,
      instrumentId,
      velocity: 1.0,
      creatorId: 0
    });

    pianoRoll.focusedPattern.notes.push(newNote);
    pianoRoll.registerNoteRect(newNote, snapOptions, noteLengthScrollDivisor);
    pianoRollLayer.draw();

    const frequency = playbackController.yToFrequency(snappedY);
    void audioManager.playTone(frequency, 100, 1.0, instrument);
  });
}
