// INIT/MAIN FILE
// Everything starts here.
import Konva from 'konva';
import { Note, NoteState } from './render/core/note';

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

const pianoRoll = new Konva.Layer();
stage.add(pianoRoll);
const notes: Note[] = [];

// render the grid
for (let i = 0; i < 128; i++) {
  const y = i * 20;
  const line = new Konva.Line({
    points: [0, y, stage.width(), y],
    stroke: '#2e2d33ff',
    dashEnabled: true,
    strokeWidth: 1
  });
  pianoRoll.add(line);
}

// temp note
const demoNote = Note.create(pianoRoll, {
  x: 100,
  y: 60,
  width: 120,
  height: 20
});
pianoRoll.draw();

//TODO: Handle this properly; Probably in pianoRoll class that nets all input
stage.on('click', (e) => {
  // Ignore clicks on existing shapes
  if (e.target !== stage) return;
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const snappedY = Math.floor(pointerPos.y / 20) * 20;

  const newNote = Note.create(pianoRoll, {
    x: pointerPos.x,
    y: snappedY,
    width: 120,
    height: 20
  });

  notes.push(newNote);
  pianoRoll.draw();
});


// Serialization
function saveNotes(): string {
  const data = notes.map(n => n.toJSON());
  return JSON.stringify(data);
}

function loadNotesFromDisk(json: string) {
  notes.forEach(n => n.delete());
  notes.length = 0;
    // Deserialize individually
  const deserialized = JSON.parse(json) as NoteState[];
  for (const n of deserialized) {
    const note = Note.create(pianoRoll, n);
    notes.push(note);
  }

  pianoRoll.draw();
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
