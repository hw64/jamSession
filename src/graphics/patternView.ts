/**
 * PATTERN VIEW (OBJECT)
 * 
 * Pattern view contains 
 */
import Konva from 'konva';
import { context } from '../core/context';
import { Vector2d } from 'konva/lib/types';
import { Note, NoteCreateOptions } from '../core/note';
import { Pattern } from '../core/pattern';
import { playbackController } from '../sound/playback';
import { audioManager } from '../sound/renderer';
import { NoteRect } from './noteRect';

  const GRID_ROW_HEIGHT = 20;
  const GRID_ROW_LENGTH = 1000;
  const NOTE_LENGTH_SCROLL_DIVISOR = 25000;
export class PatternView {



  private staff: Konva.Line[] = [];
  /** Visual playhead cursor. */
  private playhead: Konva.Line;
  private playheadTick = 0;

  /** Focal X point of piano roll "camera" measured in note ticks */
  public panX : number = 0;
  /** Focal Y point of piano roll "camera" measured in Y */
  public panY : number = 0;
  public maxPan : number = 300;
  public minPan : number = 0;
  public panScalar : number = 150;
  public focusedPattern : Pattern = context.currentPattern; //TODO: This is a temporary "default pattern" for vertical slice
  /** The visual shapes of the notes in our current pattern. */
  private noteRects = new Map<number, NoteRect>();
  constructor(private readonly layer: Konva.Layer) {
    this.playhead = new Konva.Line({
      points: [0, 0, 0, 0],
      stroke: '#ff5555',
      strokeWidth: 2,
      listening: false,
      visible: true
    });
    this.buildGrid( 128, this.focusedPattern.length, GRID_ROW_HEIGHT);
    this.layer.add(this.playhead);
    this.setPlayheadVisible(false);
    context.onPatternChange((pattern) => {
      this.focusedPattern = pattern;
      this.buildGrid(128, this.focusedPattern.length, GRID_ROW_HEIGHT);
    });
  }
  /** Create piano grid objects such as lines and existing/serialized rects for notes. Invoked when a new pattern is selected.*/
  buildGrid(rowCount: number, width: number, rowHeight = 20): void {
    // destroy everything
    for (const rect of this.noteRects.values()) {
      rect.destroy();
    }
    this.noteRects.clear();
    for (const line of this.staff) {
      line.destroy();
    }
    this.staff = [];
    
    // draw rows
    for (let i = 0; i < rowCount; i++) {
      var y = i * rowHeight;
      var color = '#2e2d33ff';
      if ((i % 12) == 0)
        color = '#5e5d63ff';

      var line = new Konva.Line({
        points: [0, y, width, y],
        stroke: color,
        dashEnabled: true,
        strokeWidth: 1
      });
      
      this.layer.add(line);
      this.staff.push(line);
    }
    // build existing notes
    const snapOptions: NoteCreateOptions = { snapX: 10, snapY: rowHeight };
    for (const note of this.focusedPattern.notes) {
      //TODO: Build existing patterns
    }

    this.updateElements();
    this.layer.batchDraw();
  }
  /** Update all visual konva elements. Used for zooming, panning, etc. */
  updateElements() : void {
    this.layer.position({
      x: this.panX,
      y: this.panY
    });
    this.updatePlayhead();
    this.playhead.moveToTop();
    this.layer.batchDraw();
  }

  setPan(x: number, y : number) {
    this.panX = x;
    this.panY = y;
    this.updateElements();
  }
  incrementPan(x: number, y: number) {
    this.setPan(this.panX - (x * this.panScalar), this.panY - (y * this.panScalar));
  }
  nudgePan(x: number, y: number) {
    this.incrementPan(x, y);
  }

  /** Translate and scale some screenspace coordinate to piano roll coordinate based on scale and pan */
  screenToRoll(screen: Vector2d): Vector2d {
    return {
      x: (screen.x - this.panX),
      y: (screen.y - this.panY),
    };
  }
/** Set playhead position using tick (x) units. */
  setPlayheadTick(tick: number): void {
    this.playheadTick = tick;
    this.updatePlayhead();
  }
  

  /** Show or hide the playhead. */
  setPlayheadVisible(isVisible: boolean): void {
    
    this.playhead.stroke(isVisible ? '#00da5eff' : '#ff4000ff')
    this.layer.batchDraw();
  }

  private updatePlayhead(): void {
    const stageHeight = this.layer.getStage()?.height() ?? 0;
    const unscaledHeight = stageHeight > 0 ? stageHeight : 0;
    this.playhead.points([this.playheadTick, 0, this.playheadTick, 128 * 20]);
    this.layer.batchDraw();
  }

  clear(): void {
    this.layer.destroyChildren();
    this.layer.draw();
  }


  public removeNote(note: Note): void {
    const patternNotes = this.focusedPattern.notes;
    const idx = patternNotes.indexOf(note);
    if (idx === -1) return;
    patternNotes.splice(idx, 1);
    note.delete();
    this.noteRects.get(note.state.id)?.destroy();
    this.noteRects.delete(note.state.id);
    this.layer.draw();
  }
}
