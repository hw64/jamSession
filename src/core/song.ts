/**
 * SONG
 * 
 * The song contains all the information about the song (duh) whether directly or indirectly.
 * The class directly holds 'global' song information like beats per minute, the name of the song, the tuning, etc.
 * The class indirectly holds the rest of the song by keeping maps containing all the instruments and patterns.
 */
import { Pattern } from './pattern';
import { Instrument } from './instrument';
import type { AppContext } from './context';

export class Song {
    /** All patterns within a song are stored here */
    public patterns: Map<number, Pattern> = new Map();
    /** The "layout" of patterns in a song, where patterns are referred to by their IDs. 
     * The "columns" are of simultaneous patterns in their columns, and you progress right a column after patterns end.
     */
    public layout: number[][] = []; 
    /** All instruments are stored here, accessed by their ID */
    public instruments: Map<number, Instrument> = new Map();
    /** Global BPM */
    public bpm: number;

    // New song default settings
    constructor() {
        this.patterns.set(0, new Pattern());
        this.patterns.set(1, new Pattern());
        this.instruments.set(0, new Instrument({ name: "Square", color:"#639cffff", waveform:"square"}));
        this.instruments.set(1, new Instrument({ name: "Triangle", color:"#7cffa1ff", waveform:"triangle"}));
        this.instruments.set(2, new Instrument({ name: "Sine", color:"#ff5860ff", waveform:"sine"}));
        this.instruments.set(3, new Instrument({ name: "Saw", color:"#ffa435ff", waveform:"sawtooth"}));
        this.bpm = 120;
    }


    //TODO Implement note appending into a pattern instead of literally to konva layer or whatever
}
