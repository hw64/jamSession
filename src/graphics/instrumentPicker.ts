/**
 * INSTRUMENT PICKER SIDEBAR
 * 
 * This is the sidebar list that contains all those instruments you create/destroy.
 * It's pretty self explanatory. A lot of ugly redundant code, mostly adapted from boilerplate GPT examples. Sue me.
 * There has to be a way to boil this down.
 * Not complex enough to justify its own input helper file, methinks.
 * TODO: The scrolling code here could probably adapt some kind of shared scrollable logic from the pan code in pianoRoll?
 */
import Konva from 'konva';
import { context } from '../core/context';
import { Instrument } from '../core/instrument';
import type { Song } from '../core/song';

type EntryRefs = { rect: Konva.Rect; text: Konva.Text; color: string };

/** Floating sidebar that lists all instruments in the current song. */
export class InstrumentPicker {
  private readonly layer: Konva.Layer;
  private readonly group: Konva.Group;
  private readonly background: Konva.Rect;
  private readonly listViewport: Konva.Group;
  private readonly listContent: Konva.Group;
  private readonly sidebarWidth = 220;
  private readonly padding = 12;
  private readonly entryHeight = 36;
  private readonly entryGap = 8;
  private readonly defaultEntryFill = '#0f0f12ff';
  private height: number;
  private selectedInstrumentId: number | null = null;
  private entries = new Map<number, EntryRefs>();
  private readonly onSelect: (instrumentId: number) => void;
  private readonly onContextMenu: (instrumentId: number) => void;
  private readonly scrollHandler: (evt: Konva.KonvaEventObject<WheelEvent>) => void;
  private song: Song;

  private constructor(
    layer: Konva.Layer,
    stageWidth: number,
    stageHeight: number,
    song: Song,
    onSelect?: (instrumentId: number) => void,
    onContextMenu?: (instrumentId: number) => void
  ) {
    this.layer = layer;
    this.height = stageHeight;
    this.song = song;
    this.onSelect = onSelect ?? (() => {});
    this.onContextMenu = onContextMenu ?? (() => {});

    const x = Math.max(0, stageWidth - this.sidebarWidth - this.padding);
    const y = this.padding;
    const height = Math.max(120, stageHeight - 2 * this.padding);

    this.group = new Konva.Group({ x, y, listening: true });

    this.background = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.sidebarWidth,
      height,
      cornerRadius: 4,
      fill: '#1b1a21ff',
      shadowColor: '#000000ff',
      shadowBlur: 8,
      shadowOpacity: 0.45
    });

    this.listViewport = new Konva.Group({
      x: this.padding,
      y: this.padding,
      clip: {
        x: 0,
        y: 0,
        width: this.sidebarWidth - this.padding * 2,
        height: height - this.padding * 2
      }
    });

    this.listContent = new Konva.Group({ x: 0, y: 0 });
    this.listViewport.add(this.listContent);

    this.group.add(this.background);
    this.group.add(this.listViewport);
    this.layer.add(this.group);
    this.background.on('pointerdown', () => {
      this.addInstrument();
    });

    this.scrollHandler = (evt) => {
      evt.evt.preventDefault();
      evt.evt.stopPropagation();
      const delta = evt.evt.deltaY;
      this.scrollBy(delta);
    };
    this.group.on('wheel.instrumentPickerScroll', this.scrollHandler);

    this.renderInstrumentList(song);
    this.layer.batchDraw();
  }

  /** Factory helper to create and mount the picker. */
  static create(
    layer: Konva.Layer,
    stageWidth: number,
    stageHeight: number,
    song: Song = context.song,
    onSelect?: (instrumentId: number) => void,
    onContextMenu?: (instrumentId: number) => void
  ): InstrumentPicker {
    return new InstrumentPicker(layer, stageWidth, stageHeight, song, onSelect, onContextMenu);
  }

  /** Resize/reposition sidebar to match the stage. */
  fillToStageSize(stageWidth: number, stageHeight: number): void {
    this.height = stageHeight;
    const x = Math.max(0, stageWidth - this.sidebarWidth - this.padding);
    const y = this.padding;
    const height = Math.max(120, stageHeight - 2 * this.padding);

    this.group.position({ x, y });
    this.background.height(height);
    this.listViewport.clipHeight(height - this.padding * 2);
    const viewportHeight = this.listViewport.clipHeight() ?? 0;
    const contentHeight = this.listContent.height();
    const clampedY = this.clamp(this.listContent.y(), viewportHeight - contentHeight, 0);
    this.listContent.y(clampedY);
    this.layer.batchDraw();
  }

  /** Re-render the list from the current song instruments. Optionally select an id. Needed for saving and loading and editing instruments. */
  rebuild(selectId?: number): void {
    if (selectId !== undefined) {
      this.selectedInstrumentId = selectId;
    }
    this.renderInstrumentList(this.song);
  }

  destroy(): void {
    this.group.off('wheel.instrumentPickerScroll', this.scrollHandler);
    this.group.destroy();
    this.layer.batchDraw();
  }

  /** The currently selected instrument id, if any. */
  getSelectedInstrumentId(): number | null {
    return this.selectedInstrumentId;
  }

  /** Programmatically select an instrument by id. */
  setSelectedInstrument(id: number | null): void {
    if (this.selectedInstrumentId === id) return;
    this.selectedInstrumentId = id;
    this.updateEntryStyles();
    if (id !== null) {
      this.onSelect(id);
    }
    this.layer.batchDraw();
  }

  private scrollBy(deltaY: number): void {
    const viewportHeight = this.listViewport.clipHeight() ?? 0;
    const contentHeight = this.listContent.height();
    if (contentHeight <= viewportHeight) return;

    const nextY = this.clamp(
      this.listContent.y() - deltaY,
      viewportHeight - contentHeight,
      0
    );
    this.listContent.y(nextY);
    this.layer.batchDraw();
  }

  private renderInstrumentList(song: Song): void {
    this.listContent.destroyChildren();
    this.entries.clear();
    let y = 0;
    const entries = Array.from(song.instruments.entries()).sort(([a], [b]) => a - b);
    for (const [id, instrument] of entries) {
      const color = instrument.color || '#f5f4f6ff';
      const label = `[${id}] ${instrument.name.toUpperCase()} `;
      const entry = new Konva.Group({
        x: 0,
        y,
        width: this.sidebarWidth - this.padding * 2,
        height: this.entryHeight,
        listening: true
      });
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: this.sidebarWidth - this.padding * 2,
        height: this.entryHeight,
        cornerRadius: 4,
        fill: this.defaultEntryFill,
        opacity: 0.9,
        stroke: instrument.color,
        strokeWidth: 2
      });
      const text = new Konva.Text({
        x: 10,
        y: 10,
        width: this.sidebarWidth - this.padding * 2 - 20,
        height: this.entryHeight,
        text: label,
        fontSize: 15,
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fill: color
      });

      entry.add(rect);
      entry.add(text);

      entry.on('pointerdown', () => {
        this.setSelectedInstrument(id);
      });
      entry.on('contextmenu', (evt) => {
        evt.evt.preventDefault();
        this.onContextMenu(id);
      });

      this.listContent.add(entry);
      this.entries.set(id, { rect, text, color });
      y += this.entryHeight + this.entryGap;
    }
    const contentHeight = entries.length > 0 ? y - this.entryGap : 0;
    this.listContent.height(contentHeight);

    if (this.selectedInstrumentId === null && entries.length > 0) {
      if (entries[0])
        this.selectedInstrumentId = entries[0][0];
    }
    this.updateEntryStyles();
    this.layer.batchDraw();
  }

  private updateEntryStyles(): void {
    for (const [id, refs] of this.entries.entries()) {
      const isSelected = id === this.selectedInstrumentId;
      refs.rect.fill(isSelected ? refs.color : this.defaultEntryFill);
      refs.text.fill(isSelected ? '#000000ff' : refs.color);
    }
  }

  private addInstrument(): void {
    const ids = Array.from(this.song.instruments.keys());
    const nextId = ids.length === 0 ? 0 : Math.max(...ids) + 1;
    this.song.instruments.set(nextId, new Instrument());
    this.selectedInstrumentId = nextId;
    this.renderInstrumentList(this.song);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
