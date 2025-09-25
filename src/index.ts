console.log("starting...");
const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
const title = document.getElementById("title");
const context = canvas.getContext("2d") as HTMLCanvasContext;

canvas.width  = window.innerWidth; 
canvas.height = window.innerHeight;
title.text = "Welcome";
context.font = " 20px Arial ";
context.strokeText("Test", 10, 50);
