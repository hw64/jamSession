console.log("starting...");
const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
var title = document.getElementById("title");
const context = canvas.getContext("2d") as CanvasRenderingContext2D;

canvas.width  = window.innerWidth; 
canvas.height = window.innerHeight;
context.font = " 20px Arial ";
context.strokeText("Test", 10, 50);
