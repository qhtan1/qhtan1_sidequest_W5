/*
Week 5 — Side Quest: Reflective Camera Cruise (Commit 1)

Goal (Commit 1):
- Replace player-driven camera with an automatic “camera cruise”
- Scroll through a world larger than the screen
- Use smooth pacing (easing + gentle camera smoothing) to feel calm

Controls:
- (Optional) Press D to toggle debug overlay
*/

const WORLD_W = 3200;
const WORLD_H = 2200;

const VIEW_W = 800;
const VIEW_H = 480;

// Camera is described as a CENTER position in world space,
// then converted to a top-left offset for translate().
let camCenter = { x: 0, y: 0 };
let cam = { x: 0, y: 0 };

// A looping path of “waypoints” for the camera to travel between.
// In Commit 2 we’ll add pauses / “breathing” and richer motion cues.
const path = [
  { x: 350, y: 380 },
  { x: 900, y: 520 },
  { x: 1500, y: 420 },
  { x: 2100, y: 760 },
  { x: 2550, y: 1250 },
  { x: 1950, y: 1650 },
  { x: 1200, y: 1700 },
  { x: 600, y: 1300 },
];

// Seconds per segment (waypoint → next waypoint)
const SEG_SECONDS = 6;

// Toggleable overlay to help you verify motion / math.
let showDebug = true;

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);

  // Start camera on first waypoint.
  camCenter.x = path[0].x;
  camCenter.y = path[0].y;
}

function draw() {
  // ---------- 1) UPDATE VIEW STATE (CAMERA) ----------
  // Compute where the camera *wants* to be along the path.
  const t = millis() / 1000; // seconds
  const segFloat = t / SEG_SECONDS;
  const i0 = floor(segFloat) % path.length;
  const i1 = (i0 + 1) % path.length;

  // Progress within this segment (0..1)
  const uRaw = segFloat - floor(segFloat);

  // Ease progress so movement feels soft (no sudden starts/stops).
  const u = smoothstep(uRaw);

  const target = {
    x: lerp(path[i0].x, path[i1].x, u),
    y: lerp(path[i0].y, path[i1].y, u),
  };

  // Gentle smoothing so the camera “floats” a bit behind the target.
  const follow = 0.03; // smaller = slower/softer
  camCenter.x = lerp(camCenter.x, target.x, follow);
  camCenter.y = lerp(camCenter.y, target.y, follow);

  // Convert center → top-left offset for translate()
  cam.x = camCenter.x - width / 2;
  cam.y = camCenter.y - height / 2;

  // ---------- 2) DRAW ----------
  background(220);

  // World layer (scrolling)
  push();
  translate(-cam.x, -cam.y);
  drawWorld();
  pop();

  // HUD (screen space)
  drawHUD(target);
}

function drawWorld() {
  // World background (big rectangle so it’s obvious the world is larger)
  noStroke();
  fill(236);
  rect(0, 0, WORLD_W, WORLD_H);

  // Light grid to make motion easy to perceive
  stroke(245);
  for (let x = 0; x <= WORLD_W; x += 160) line(x, 0, x, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += 160) line(0, y, WORLD_W, y);

  // Simple “landmarks” (Commit 1: just enough structure to feel like a place)
  noStroke();

  // Soft blocks
  fill(190, 205, 220);
  for (let i = 0; i < 34; i++) {
    const x = (i * 280) % WORLD_W;
    const y = (i * 170) % WORLD_H;
    rect(x + 60, y + 60, 90, 90, 14);
  }

  // A few “islands” (circles) to break the grid monotony
  fill(210, 220, 205);
  for (let i = 0; i < 16; i++) {
    const x = (i * 410 + 200) % WORLD_W;
    const y = (i * 260 + 140) % WORLD_H;
    circle(x, y, 140);
  }
}

function drawHUD(target) {
  noStroke();
  fill(20);
  text("Side Quest W5 — Reflective camera cruise (Commit 1)", 12, 20);
  text(
    "Camera moves automatically through a world larger than the screen.",
    12,
    40,
  );
  text("Press D to toggle debug overlay.", 12, 60);

  if (!showDebug) return;

  // Debug readout
  fill(0, 0, 0, 160);
  rect(10, height - 92, 520, 78, 10);

  fill(255);
  text(
    `camCenter(world): ${camCenter.x | 0}, ${camCenter.y | 0}   camTopLeft(world): ${cam.x | 0}, ${cam.y | 0}`,
    22,
    height - 62,
  );
  text(`target(world): ${target.x | 0}, ${target.y | 0}`, 22, height - 40);
}

function keyPressed() {
  if (key === "d" || key === "D") showDebug = !showDebug;
}

// --- Helpers ---
function smoothstep(x) {
  // Clamp, then cubic smoothstep
  x = constrain(x, 0, 1);
  return x * x * (3 - 2 * x);
}
