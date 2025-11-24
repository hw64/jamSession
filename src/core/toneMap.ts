/** Basic tone map that converts chromatic scale steps to frequencies. */
//TODO: Unimplemented!!!
export class ToneMap {
  /** Reference frequency (A4). */
  private readonly referenceHz = 440;
  /** MIDI note number for the reference frequency. */
  private readonly referenceMidi = 69;


  // TODO PLACEHOLDER CODE! This simply returns chromatic scale without variation.
  /** Return the frequency for a chromatic step and octave offset from A4. */
  getFrequency(step: number, octave: number): number {
    const normalizedStep = ((step % 12) + 12) % 12;
    const octaveOffset = octave * 12;
    const midiNote = this.referenceMidi + normalizedStep + octaveOffset;
    return this.referenceHz * Math.pow(2, (midiNote - this.referenceMidi) / 12);
  }
}
