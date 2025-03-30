function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}

function draw() {
  background(30, 30, 60, 20);
  fill(200, 100, 255);
  ellipse(mouseX, mouseY, 40, 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
