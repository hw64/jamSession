import { Note, NoteState } from './note';
import { Pattern } from './pattern'

export class Song {
    /** All patterns within a song are stored here */
    private readonly patterns : Pattern[] = [];
    //TODO Implement note appending into a pattern instead of literally to konva layer or whatever

}