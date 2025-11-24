/**
 * PATTERN
 * 
 * A pattern is basically just a list of notes, with a tone map. 
 * It has a length after which it moves onto the next pattern in the list.
 */
import { Note, NoteState } from './note';
import { ToneMap } from './toneMap';

export class Pattern {
    /** All notes within a pattern are stored here */
    public notes : Note[];
    /** Tonemap for this pattern. */
    public toneMap : ToneMap;
    public length : number;
    /** Unique identifier for this pattern instance. */
    public readonly id: number;
    private static nextId = 0;
    // New song default settings
        constructor() {
            this.notes = [];
            this.toneMap = new ToneMap;
            this.length = 1024;
            this.id = Pattern.nextId++;
        }
    //TODO Implement note appending into a pattern instead of literally to konva layer or whatever

}
