/**
 * INSTRUMENT CONFIG DIALOGUE
 * 
 * The fugly html box that pops up when you right click an instrument to edit its values.
 * Eventually we will want a custom UI that looks sort of like an actual synth. Someday.
 * TODO: Fix ADSR Adjustment
 * TODO: Convert whole thing into a real custom interface.
 */

import Konva from 'konva';
import { context } from '../core/context';
import type { Instrument } from '../core/instrument';
import { PianoRoll } from './pianoRoll';
import { InstrumentPicker } from './instrumentPicker';

/** Fullscreen instrument editor modal that binds directly to the song instruments. */
export class InstrumentConfig {
  private readonly layer: Konva.Layer;
  private readonly overlay: Konva.Rect;
  private readonly panel: Konva.Rect;
  private readonly group: Konva.Group;
  private activeInstrumentId: number | null = null;
  private formContainer: HTMLDivElement;
  private deleteButton: HTMLButtonElement;
  private formFields: {
    name: HTMLInputElement;
    color: HTMLInputElement;
    waveform: HTMLSelectElement;
    volume: HTMLInputElement;
    attack: HTMLInputElement;
    decay: HTMLInputElement;
    sustain: HTMLInputElement;
    release: HTMLInputElement;
  };

  private constructor(
    layer: Konva.Layer,
    private readonly stage: Konva.Stage,
    private readonly pianoRoll?: PianoRoll,
    private readonly instrumentPicker?: InstrumentPicker
  ) {
    this.layer = layer;
    const { width, height } = stage.size();

    this.group = new Konva.Group({ listening: true, visible: false });
    this.overlay = new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fill: 'rgba(0,0,0,0.6)'
    });
    const panelWidth = Math.min(420, width - 32);
    const panelHeight = Math.min(360, height - 32);
    this.panel = new Konva.Rect({
      x: (width - panelWidth) / 2,
      y: (height - panelHeight) / 2,
      width: panelWidth,
      height: panelHeight,
      cornerRadius: 8,
      fill: '#1c1b22ff',
      stroke: '#3c3b43ff',
      strokeWidth: 2,
      shadowColor: '#000000ff',
      shadowBlur: 16,
      shadowOpacity: 0.45
    });
    this.panel.visible(false);
    this.panel.listening(false);

    this.group.add(this.overlay);
    this.group.add(this.panel);
    this.layer.add(this.group);
    this.overlay.on('pointerdown', (evt) => {
      evt.evt?.preventDefault();
      evt.cancelBubble = true;
      this.close();
    });

    // Build HTML form overlay
    this.formContainer = document.createElement('div');
    this.formContainer.style.position = 'fixed';
    this.formContainer.style.top = '0';
    this.formContainer.style.left = '0';
    this.formContainer.style.width = '100%';
    this.formContainer.style.height = '100%';
    this.formContainer.style.display = 'none';
    this.formContainer.style.alignItems = 'center';
    this.formContainer.style.justifyContent = 'center';
    this.formContainer.style.pointerEvents = 'none';
    this.formContainer.style.zIndex = '9999';

    const form = document.createElement('div');
    form.style.pointerEvents = 'auto';
    form.style.background = '#2a2932';
    form.style.border = '1px solid #3c3b43';
    form.style.borderRadius = '8px';
    form.style.padding = '16px';
    form.style.width = `${panelWidth - 24}px`;
    form.style.maxWidth = '520px';
    form.style.color = '#f5f4f6';
    form.style.fontFamily = 'sans-serif';
    form.style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';

    const makeRow = (labelText: string, input: HTMLInputElement | HTMLSelectElement) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '4px';
      row.style.marginBottom = '10px';
      const label = document.createElement('label');
      label.textContent = labelText;
      label.style.fontSize = '13px';
      label.style.color = '#c4c3cc';
      label.appendChild(input);
      input.style.padding = '8px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #4a4952';
      input.style.background = '#1e1d24';
      input.style.color = '#f5f4f6';
      input.style.fontSize = '14px';
      if (input.type === 'color') {
        input.style.height = '36px';
        input.style.width = '100%';
        input.style.padding = '4px';
      }
      if (input instanceof HTMLSelectElement) {
        input.style.height = '36px';
        input.style.width = '100%';
        input.style.padding = '6px 8px';
      }
      if (input.type === 'range') {
        input.style.width = '100%';
        input.style.padding = '0';
      }
      row.appendChild(label);
      return row;
    };

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    const waveformInput = document.createElement('select');
    ['sine', 'square', 'sawtooth', 'triangle'].forEach((type) => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      waveformInput.appendChild(opt);
    });
    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.step = '0.01';
    volumeInput.min = '0';
    volumeInput.max = '1';
    const attackInput = document.createElement('input');
    attackInput.type = 'number';
    attackInput.step = '0.01';
    const decayInput = document.createElement('input');
    decayInput.type = 'number';
    decayInput.step = '0.01';
    const sustainInput = document.createElement('input');
    sustainInput.type = 'number';
    sustainInput.step = '0.01';
    const releaseInput = document.createElement('input');
    releaseInput.type = 'number';
    releaseInput.step = '0.01';

    form.appendChild(makeRow('Name', nameInput));
    form.appendChild(makeRow('Color', colorInput));
    form.appendChild(makeRow('Waveform', waveformInput));
    form.appendChild(makeRow('Volume', volumeInput));
    this.deleteButton = document.createElement('button');
    this.deleteButton.textContent = 'DELETE';
    this.deleteButton.style.marginTop = '8px';
    this.deleteButton.style.padding = '10px 12px';
    this.deleteButton.style.borderRadius = '6px';
    this.deleteButton.style.border = '1px solid #4a4952';
    this.deleteButton.style.background = '#ea0037ff';
    this.deleteButton.style.color = '#ffffff';
    this.deleteButton.style.fontSize = '16px';
    this.deleteButton.style.fontStyle = 'bold';
    this.deleteButton.style.cursor = 'pointer';
    this.deleteButton.addEventListener('click', () => this.deleteActiveInstrument());
    form.appendChild(this.deleteButton);
    /* Out of time to get this working.
    form.appendChild(makeRow('Attack', attackInput));
    form.appendChild(makeRow('Decay', decayInput));
    form.appendChild(makeRow('Sustain', sustainInput));
    form.appendChild(makeRow('Release', releaseInput));
    **/

    this.formContainer.appendChild(form);
    document.body.appendChild(this.formContainer);
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape') {
        this.close();
      }
    });

    // Bind updates to instrument
    nameInput.addEventListener('input', () => this.updateActiveInstrument({ name: nameInput.value }));
    colorInput.addEventListener('input', () => this.updateActiveInstrument({ color: colorInput.value }));
    waveformInput.addEventListener('change', () => this.updateActiveInstrument({ waveform: waveformInput.value as OscillatorType }));
    volumeInput.addEventListener('input', () => this.updateActiveInstrument({ volume: parseFloat(volumeInput.value) || 0 }));
    attackInput.addEventListener('input', () => this.updateActiveInstrument({ attack: parseFloat(attackInput.value) || 0 }));
    decayInput.addEventListener('input', () => this.updateActiveInstrument({ decay: parseFloat(decayInput.value) || 0 }));
    sustainInput.addEventListener('input', () => this.updateActiveInstrument({ sustain: parseFloat(sustainInput.value) || 0 }));
    releaseInput.addEventListener('input', () => this.updateActiveInstrument({ release: parseFloat(releaseInput.value) || 0 }));

    this.formFields = {
      name: nameInput,
      color: colorInput,
      waveform: waveformInput,
      volume: volumeInput,
      attack: attackInput,
      decay: decayInput,
      sustain: sustainInput,
      release: releaseInput
    };
  }

  /** Factory helper */
  static create(
    layer: Konva.Layer,
    stage: Konva.Stage,
    pianoRoll?: PianoRoll,
    instrumentPicker?: InstrumentPicker
  ): InstrumentConfig {
    return new InstrumentConfig(layer, stage, pianoRoll, instrumentPicker);
  }

  /** Adjust overlay and form sizing on stage resize. */
  fillToStageSize(width: number, height: number): void {
    this.overlay.size({ width, height });
    const panelWidth = Math.min(420, width - 32);
    const panelHeight = Math.min(360, height - 32);
    this.panel.size({ width: panelWidth, height: panelHeight });
    this.panel.position({ x: (width - panelWidth) / 2, y: (height - panelHeight) / 2 });
    this.layer.batchDraw();
  }

  /** Open modal for the given instrument id. */
  openInstrument(instrumentId: number): void {
    const instrument = context.song.instruments.get(instrumentId);
    if (!instrument) return;
    this.activeInstrumentId = instrumentId;
    this.populateForm(instrument);
    this.group.visible(true);
    this.layer.batchDraw();
    this.formContainer.style.display = 'flex';
  }

  close(): void {
    this.activeInstrumentId = null;
    this.group.visible(false);
    this.layer.batchDraw();
    this.formContainer.style.display = 'none';
    this.pianoRoll?.buildGrid(128, this.pianoRoll.focusedPattern.length);
    this.instrumentPicker?.rebuild();
  }

  private populateForm(instrument: Instrument): void {
    this.formFields.name.value = instrument.name;
    // HTML color inputs prefer #RRGGBB; strip alpha if present.
    this.formFields.color.value = (instrument.color?.length ?? 0) >= 7 ? instrument.color.slice(0, 7) : instrument.color;
    this.formFields.waveform.value = instrument.waveform || '';
    this.formFields.volume.value = instrument.volume.toString();
    this.formFields.attack.value = instrument.attack.toString();
    this.formFields.decay.value = instrument.decay.toString();
    this.formFields.sustain.value = instrument.sustain.toString();
    this.formFields.release.value = instrument.release.toString();
  }

  private updateActiveInstrument(partial: Partial<Instrument>): void {
    if (this.activeInstrumentId === null) return;
    const instrument = context.song.instruments.get(this.activeInstrumentId);
    if (!instrument) return;
    Object.assign(instrument, partial);
  }

  private deleteActiveInstrument(): void {
    if (this.activeInstrumentId === null) return;
    context.song.instruments.delete(this.activeInstrumentId);
    const nextId = Array.from(context.song.instruments.keys()).sort((a, b) => a - b)[0] ?? null;
    this.activeInstrumentId = null;
    this.instrumentPicker?.rebuild(nextId ?? undefined);
    this.pianoRoll?.buildGrid(128, this.pianoRoll.focusedPattern.length);
    this.close();
  }
}
