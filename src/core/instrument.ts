/**
 * INSTRUMENT
 * 
 * Our renderer.ts file is basically the real "instrument" per se, but this is a preset that can be fed into it with specs.
 */
import { Note, NoteState } from './note';
import { Pattern } from './pattern'

export class Instrument {
    public name: string = "";
    public color: string = "#ffffff";
    public waveform: OscillatorType = 'square';
    /** Placeholder for future PCM/sample data. */
    public sample: Float64Array = new Float64Array(); // unused for now
    public attack: number = 0.01;
    public decay: number = 0.05;
    public sustain: number = 0.7;
    public release: number = 0.1;
    public volume: number = 1.0;

    constructor(init: Partial<Instrument> = {}) {
        this.name = init.name ?? this.name;
        this.color = init.color ?? this.color;
        this.sample = init.sample ?? this.sample;
        this.waveform = init.waveform ?? this.waveform;
        this.attack = init.attack ?? this.attack;
        this.decay = init.decay ?? this.decay;
        this.sustain = init.sustain ?? this.sustain;
        this.release = init.release ?? this.release;
        this.volume = init.volume ?? this.volume;
    }

}
