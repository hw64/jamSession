// INIT/MAIN FILE
// Everything starts here.
import Konva from 'konva';
import { Note, NoteState } from './core/note';
import { PianoRoll } from './graphics/pianoRoll';

console.log("starting...");
var jsWarning = document.getElementById("jsWarning"); // you need js to run this (duh)
if (jsWarning)
    jsWarning.remove();

// konva init function. handled by konda (apparently)
export default function init() {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#55f';
  ctx.fillRect(100, 100, 150, 80); // test rectangle
}

/*
const audioCtx = new AudioContext();
await audioCtx.resume(); // needed after user gesture

const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain).connect(audioCtx.destination);
**/

// create new canvas
const stage = new Konva.Stage({
  container: 'container',
  width: window.innerWidth,
  height: window.innerHeight
});

const pianoRollLayer = new Konva.Layer();

const pianoRoll = new PianoRoll(pianoRollLayer);
stage.add(pianoRollLayer);

pianoRoll.buildGrid(128, stage.width());
stage.container().addEventListener('wheel', () => {
  
  pianoRoll.buildGrid(128, stage.width());
});

// temp note
const demoNote = Note.create(pianoRollLayer, {
  id: pianoRoll.focusedPattern.notes.length, // empty list -> new note with ID: 0, one note -> ID: 1, n notes -> ID: n
  x: 100,
  y: 60,
  width: 120,
  height: 20
});
pianoRollLayer.draw();

//TODO: Handle this properly; Probably in pianoRoll class that nets all input
stage.on('click', (e) => {
  // Ignore clicks on existing shapes
  if (e.target !== stage) return;
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const snappedY = Math.floor(pointerPos.y / 20) * 20;

  const newNote = Note.create(pianoRollLayer, {
    id: pianoRoll.focusedPattern.notes.length, // empty list -> new note with ID: 0, one note -> ID: 1, n notes -> ID: n
    x: pointerPos.x,
    y: snappedY,
    width: 120,
    height: 20
  });

  pianoRoll.focusedPattern.notes.push(newNote);
  pianoRollLayer.draw();
});


// Serialization
function saveNotes(): string {
  const data = pianoRoll.focusedPattern.notes.map(n => n.toJSON());
  return JSON.stringify(data);
}

function loadNotesFromDisk(json: string) {
  pianoRoll.focusedPattern.notes.forEach(n => n.delete());
  pianoRoll.focusedPattern.notes.length = 0;
    // Deserialize individually
  const deserialized = JSON.parse(json) as NoteState[];
  for (const n of deserialized) {
    const note = Note.create(pianoRollLayer, n);
    pianoRoll.focusedPattern.notes.push(note);
  }

  pianoRollLayer.draw();
}

// TODO: Create new layer

// File load
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
if (fileInput) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadNotesFromDisk(reader.result as string);
    reader.readAsText(file);
  });
}

// Export to file
function downloadNotesToDisk() {
  const draftBlob = new Blob([saveNotes()], { type: 'application/json' });
  const url = URL.createObjectURL(draftBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notes.json';
  a.click();
  URL.revokeObjectURL(url);
}

(window as any).downloadNotesFromDisk = downloadNotesToDisk; // Temporary global hook
