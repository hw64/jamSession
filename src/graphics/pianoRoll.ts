import Konva from 'konva';
import { Pattern } from '../core/pattern'
/** The class responsible for drawing the pianoRoll and the konva elements within. 
 * 
 * Only really reads data from the focused pattern; Doesn't have data of its own. */
export class PianoRoll {
  private gridLines : Konva.Line[] = [];
  /** Horizontal zoom. */
  private zoomX : number = 1.0;
  /** Vertical zoom. */
  private zoomY : number = 1.0;
  public focusedPattern : Pattern = new Pattern(); //TODO: This is a temporary "default pattern" for vertical slice
  private noteRects: Konva.Rect[] = []
  constructor(private readonly layer: Konva.Layer) {}
  /** Draw piano roll grid for the very first time. Invoked when a new pattern is selected.*/
  buildGrid(rowCount: number, width: number, rowHeight = 20): void {
    for (let i = 0; i < rowCount; i++) {
      const y = i * rowHeight;
      const line = new Konva.Line({
        points: [0, y, width, y],
        stroke: '#2e2d33ff',
        dashEnabled: true,
        strokeWidth: 1
      });
      this.layer.add(line);
    }
    this.layer.batchDraw();
  }
  /** Update all visual konva elements. Used for zooming, panning, etc. */
  updateElements() : void {

  }

  clear(): void {
    this.layer.destroyChildren();
    this.layer.draw();
  }
}
