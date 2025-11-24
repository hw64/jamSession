/**
 * MAIN INIT FILE
 * 
 * Everything starts here.
 * Everything is linked up here.
 * TODO: That register stuff is so ugly. No way this is the only way.
 * TODO: All those constants should either be in piano roll or global context. They're clogging up the control flow readability.
 * 
 */
import Konva from 'konva';
import { context } from './core/context';
import { Note, NoteState } from './core/note';
import { Song } from './core/song'
import { PianoRoll, NOTE_SNAP_X } from './graphics/pianoRoll';
import { ToolBar } from './graphics/toolBar';
import { InstrumentPicker } from './graphics/instrumentPicker';
import { InstrumentConfig } from './graphics/instrumentConfig';
import { playbackController } from './sound/playback';
import { audioManager } from './sound/renderer';
import { attachNoteInteractions, registerPianoRollWheelInput, registerPianoRollClickToAddNote } from './graphics/pianoRoll.input';

console.log("starting...");
var jsWarning = document.getElementById("jsWarning"); // you need js to run this (duh)
if (jsWarning)
    jsWarning.remove();

// konva init function. handled by konda (apparently)
export default function init() {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
}

// create new canvas
const stage = new Konva.Stage({
  container: 'container',
  width: window.innerWidth,
  height: window.innerHeight
});


const GRID_ROW_HEIGHT = 20;
const NOTE_SNAP_OPTIONS = { snapX: NOTE_SNAP_X, snapY: GRID_ROW_HEIGHT };
const PAN_STEP = 25;
const MOUSE_WHEEL_ZOOM_SENSITIVITY = 0.0015;
const TRACKPAD_PINCH_ZOOM_SENSITIVITY = 0.0008;
const NOTE_LENGTH_SCROLL_DIVISOR = 25000;


/**
 * COMPOSE KONVA LAYERS
 */
const patternPickerLayer = new Konva.Layer();
stage.add(patternPickerLayer); // screen for pattern picker.
const pianoRollLayer = new Konva.Layer();
stage.add(pianoRollLayer); // screen for piano roll editor.
const toolbarLayer = new Konva.Layer();
stage.add(toolbarLayer); // toolbar layer. This is global, hovering over any active layer.
const instrumentPickerLayer = new Konva.Layer();
stage.add(instrumentPickerLayer); // instrument picker toolbar. This is global, hovering over any active layer.
const instrumentConfigLayer = new Konva.Layer();
stage.add(instrumentConfigLayer); // fullscreen instrument editor dialog layer
/**
 * AND THEN ASSIGN THEM TO THEIR OBJECTS
 */
//const patternPickerObject = new PatternPicker(patternPickerLayer);
const pianoRollObject = new PianoRoll(pianoRollLayer);

const instrumentPickerObject = InstrumentPicker.create(
  instrumentPickerLayer,
  stage.width(),
  stage.height(),
  context.song,
  undefined,
  (id) => instrumentConfigObject.openInstrument(id)
);
const toolBarObject = ToolBar.create(toolbarLayer, stage.width(), 68, instrumentPickerObject);
const instrumentConfigObject = InstrumentConfig.create(instrumentConfigLayer, stage, pianoRollObject, instrumentPickerObject);

playbackController.setPattern(pianoRollObject.focusedPattern);

// everything is subscribed to everything else here
playbackController.subscribe({
  onPlay: () => {
    pianoRollObject.setPlayheadTickPos(0);
    pianoRollObject.setPlayheadVisible(true);
  },
  onStop: () => {
    pianoRollObject.setPlayheadTickPos(0);
    pianoRollObject.setPlayheadVisible(false);
  },
  onTick: (tick) => {
    pianoRollObject.setPlayheadTickPos(tick);
  }
});
registerPianoRollWheelInput(
  stage,
  pianoRollLayer,
  pianoRollObject,
  MOUSE_WHEEL_ZOOM_SENSITIVITY,
  TRACKPAD_PINCH_ZOOM_SENSITIVITY
);
registerPianoRollClickToAddNote(
  stage,
  pianoRollLayer,
  pianoRollObject,
  NOTE_SNAP_OPTIONS,
  GRID_ROW_HEIGHT,
  NOTE_LENGTH_SCROLL_DIVISOR,
  () => instrumentPickerObject.getSelectedInstrumentId()
);
stage.container().addEventListener(
  'pointerdown',
  () => {
    void audioManager.init();
  },
  { once: true }
);

// global resize modifiers
window.addEventListener('resize', () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);
  toolBarObject.fillToScreenWidth(stage.width());
  instrumentPickerObject.fillToStageSize(stage.width(), stage.height());
  instrumentConfigObject.fillToStageSize(stage.width(), stage.height());
});


// Global Key Input handling
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const code = event.code || event.key;
  switch (code) {
    case 'Space':
      event.preventDefault();
      playbackController.setPattern(pianoRollObject.focusedPattern);
      playbackController.togglePlay();
      break;
    case 'Backquote': // tilde/backtick key
      event.preventDefault();
      pianoRollObject.focusedPattern = context.currentPattern;
      pianoRollObject.buildGrid(128, stage.width(), GRID_ROW_HEIGHT);
      console.log("redraw...");
      break;
    case 'Digit1':
      
      event.preventDefault();
      {
        var get = context.song.patterns.get(0)
        if (!get) return;
        context.setCurrentPattern(get);
      }
      console.log(context.currentPattern.id);
      break;
    case 'Digit2':
      event.preventDefault();
      {
        var get = context.song.patterns.get(1)
        if (!get) return;
        context.setCurrentPattern(get);
      }
      console.log(context.currentPattern.id);
      break;
    default:
      break;
  }
});




// TODO: Create new layer
