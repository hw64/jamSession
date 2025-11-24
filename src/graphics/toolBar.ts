/**
 * TOOLBAR
 * 
 * This is the object responsible for the konva code and logic of the toolbar.
 * Unlike piano roll I don't think it has enough unique elements to justify bifurcated input file and logic files.
 * You can play, save, load, and adjust BPM.
 * TODO: Replace bad html bpm thing with a nice looking one.
 * 
 */
import Konva from 'konva';
import { playbackController, PlaybackListener } from '../sound/playback';
import { serializeSong, deserializeSong } from '../core/serialization';
import { context } from '../core/context';
import type { InstrumentPicker } from './instrumentPicker';

/** konva gui toolbar; buttons within */
export class ToolBar {
  private readonly layer: Konva.Layer;
  private readonly group: Konva.Group;
  private readonly background: Konva.Rect;
  private readonly playButtonRect: Konva.Rect;
  private readonly playButtonText: Konva.Text;
  private readonly saveButtonRect: Konva.Rect;
  private readonly saveButtonText: Konva.Text;
  private readonly loadButtonRect: Konva.Rect;
  private readonly loadButtonText: Konva.Text;
  private readonly instrumentPicker: InstrumentPicker | undefined;
  private bpmInput: HTMLInputElement | null = null;
  private readonly handlePlayToggle: () => void;
  private readonly handleSave: () => void;
  private readonly handleLoad: () => void;
  private unsubscribe: (() => void) | null = null;

  private constructor(layer: Konva.Layer, width: number, height: number, instrumentPicker?: InstrumentPicker) {
    this.layer = layer;
    this.instrumentPicker = instrumentPicker;
    this.group = new Konva.Group({ x: 0, y: 0, listening: true });

    this.background = new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: 70 }, // top → bottom
      fillLinearGradientColorStops: [0, 'rgba(0,0,0,1)', 1, 'rgba(0,0,0,0)']
    });

    const buttonWidth = 96;
    const buttonHeight = Math.max(28, height - 36);
    const buttonY = (height - buttonHeight) / 2;
    const gap = 12;

    this.playButtonRect = new Konva.Rect({
      x: 12,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      fill: '#ff4000ff',
      shadowColor: '#ff4000ff',
      shadowBlur: 12,
      shadowOffsetY: 0,
      shadowOpacity: 0.9
    });

    this.playButtonText = new Konva.Text({
      x: 12,
      y: buttonY,
      width: buttonWidth,
      text: '⏹ STOPPED',
      align: 'center',
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontStyle: 'bold',
      fill: '#000000ff'
    });
    this.centerText(buttonY, buttonHeight);

    // there has to be a way to consolidate this right??
    // save
    const saveX = this.playButtonRect.x() + buttonWidth + gap;
    this.saveButtonRect = new Konva.Rect({
      x: saveX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      fill: '#009dffff',
      shadowColor: '#009dffff',
      shadowBlur: 12,
      shadowOffsetY: 0,
      shadowOpacity: 0.9
    });
    this.saveButtonText = new Konva.Text({
      x: saveX,
      y: buttonY,
      width: buttonWidth,
      text: '⬇ SAVE',
      align: 'center',
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontStyle: 'bold',
      fill: '#000000ff'
    });
    this.centerText(buttonY, buttonHeight, this.saveButtonText);

    // load
    const loadX = saveX + buttonWidth + gap;
    this.loadButtonRect = new Konva.Rect({
      x: loadX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      fill: '#811bffff',
      shadowColor: '#811bffff',
      shadowBlur: 12,
      shadowOffsetY: 0,
      shadowOpacity: 0.9
    });
    this.loadButtonText = new Konva.Text({
      x: loadX,
      y: buttonY,
      width: buttonWidth,
      text: '⬆ LOAD',
      align: 'center',
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontStyle: 'bold',
      fill: '#000000ff'
    });
    this.centerText(buttonY, buttonHeight, this.loadButtonText);

    this.group.add(this.background);
    this.group.add(this.playButtonRect);
    this.group.add(this.playButtonText);
    this.group.add(this.saveButtonRect);
    this.group.add(this.saveButtonText);
    this.group.add(this.loadButtonRect);
    this.group.add(this.loadButtonText);
    this.layer.add(this.group);
    this.layer.batchDraw();
    this.createBpmInput();

    // shitcoodeeee
    this.handlePlayToggle = () => playbackController.togglePlay();
    this.handleSave = () => this.promptSave();
    this.handleLoad = () => this.promptLoad();
    this.playButtonRect.on('pointerdown', this.handlePlayToggle);
    this.playButtonText.on('pointerdown', this.handlePlayToggle);
    this.saveButtonRect.on('pointerdown', this.handleSave);
    this.saveButtonText.on('pointerdown', this.handleSave);
    this.loadButtonRect.on('pointerdown', this.handleLoad);
    this.loadButtonText.on('pointerdown', this.handleLoad);

    const listener: PlaybackListener = {
      onPlay: () => this.setButtonLabel(true),
      onStop: () => this.setButtonLabel(false)
    };
    this.unsubscribe = playbackController.subscribe(listener);
  }

  /** factory helper to create and mount a toolbar on a konva layer. */
  static create(layer: Konva.Layer, width: number, height = 68, instrumentPicker?: InstrumentPicker): ToolBar {
    return new ToolBar(layer, width, height, instrumentPicker);
  }

  /** update toolbar width to match the stage size. */
  fillToScreenWidth(width: number): void {
    this.background.width(width);
    this.layer.batchDraw();
  }

  /** remove konva nodes and listeners owned by the toolbar. */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.playButtonRect.off('pointerdown', this.handlePlayToggle);
    this.playButtonText.off('pointerdown', this.handlePlayToggle);
    this.saveButtonRect.off('pointerdown', this.handleSave);
    this.saveButtonText.off('pointerdown', this.handleSave);
    this.loadButtonRect.off('pointerdown', this.handleLoad);
    this.loadButtonText.off('pointerdown', this.handleLoad);
    this.group.destroy();
    if (this.bpmInput?.parentElement) {
      this.bpmInput.parentElement.remove();
    }
    this.layer.batchDraw();
  }

  private setButtonLabel(isPlaying: boolean): void {
    this.playButtonText.text(isPlaying ? '▶ PLAYING' : '⏹ STOPPED');
    this.centerText(this.playButtonRect.y(), this.playButtonRect.height(), this.playButtonText);
    const color = isPlaying ? '#00da5eff' : '#ff4000ff';
    this.playButtonRect.fill(color);
    this.playButtonRect.shadowColor(color)
    this.layer.batchDraw();
  }

  private centerText(buttonY: number, buttonHeight: number, textNode: Konva.Text = this.playButtonText): void {
    let textHeight = 0;
    if (typeof (textNode as any).textHeight === 'function') {
      textHeight = (textNode as any).textHeight();
    }
    if (!textHeight) {
      textHeight = textNode.height() || textNode.fontSize();
    }
    const offset = (buttonHeight - textHeight) / 2;
    textNode.y(buttonY + offset);
  }

  private promptSave(): void {
    const data = serializeSong();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'song.sesh';
    a.click();
    URL.revokeObjectURL(url);
  }

  private promptLoad(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sesh,application/sesh';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        if (text) {
          deserializeSong(text, context);
          this.instrumentPicker?.rebuild();
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private createBpmInput(): void {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '10px';
    wrapper.style.left = '340px';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '6px';
    wrapper.style.padding = '6px 8px';
    wrapper.style.background = 'rgba(0,0,0,0.4)';
    wrapper.style.borderRadius = '6px';
    wrapper.style.zIndex = '9998';


    const input = document.createElement('input');
    input.type = 'number';
    input.min = '30';
    input.max = '300';
    input.step = '1';
    input.value = context.song.bpm.toString();
    input.style.width = '64px';
    input.style.padding = '6px';
    input.style.borderRadius = '4px';
    input.style.border = '1px solid #4a4952';
    input.style.background = '#1e1d24';
    input.style.color = '#f5f4f6';
    input.style.fontSize = '14px';

    input.addEventListener('input', () => {
      const next = parseFloat(input.value);
      if (Number.isFinite(next)) {
        context.song.bpm = next;
        playbackController.setConfig({ bpm: next });
      }
    });

    wrapper.appendChild(input);
    document.body.appendChild(wrapper);
    this.bpmInput = input;
  }
}
