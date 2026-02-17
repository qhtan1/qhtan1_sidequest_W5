/*
Week 5 — Side Quest: Reflective Camera Cruise (Commit 1)

Goal (Commit 1):
- Replace player-driven camera with an automatic “camera cruise”
- Scroll through a world larger than the screen
- Use smooth pacing (easing + gentle camera smoothing) to feel calm

Controls:
- (Optional) Press D to toggle debug overlay
*/
const VERSION = "v1.0";
let showDebug = false;

const COL_BG = 235;
const COL_GRID = 242;
const COL_TEXT = 30;

const WORLD_W = 3200;
const WORLD_H = 2200;

// Quiet completion bloom (cinematic, low-energy)
let completionPlayed = false;
const completionParticles = [];
let completionT0 = 0;

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

// ---- Discoverables (Commit 3) ----
const discoverables = [
  { x: 520, y: 460, r: 12, found: false },
  { x: 980, y: 560, r: 12, found: false },
  { x: 1420, y: 380, r: 12, found: false },
  { x: 1760, y: 640, r: 12, found: false },
  { x: 2140, y: 820, r: 12, found: false },
  { x: 2480, y: 1180, r: 12, found: false },
  { x: 2060, y: 1600, r: 12, found: false },
  { x: 1520, y: 1760, r: 12, found: false },
  { x: 980, y: 1680, r: 12, found: false },
  { x: 640, y: 1320, r: 12, found: false },
];

// Discovery pulse effects (screen feedback for "found" moments)
const pulses = [];

function discoveredCount() {
  let c = 0;
  for (const d of discoverables) if (d.found) c++;
  return c;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textSize(14);

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

  // ----- BREATHING PHASE SPLIT -----
  let movePortion = 0.8;

  if (nearUndiscovered()) {
    movePortion = 0.6;
  }

  let u;

  if (uRaw < movePortion) {
    // Moving phase
    const moveU = uRaw / movePortion;
    u = easeInOutSine(moveU);
  } else {
    // Pause phase (freeze at end of segment)
    u = 1;
  }

  const target = {
    x: lerp(path[i0].x, path[i1].x, u),
    y: lerp(path[i0].y, path[i1].y, u),
  };
  // ----- SUBTLE DRIFT (meditative floating) -----
  let driftStrength = 8;

  if (nearUndiscovered()) {
    driftStrength = 3;
  }

  const driftX = sin(millis() * 0.0003) * driftStrength;
  const driftY = cos(millis() * 0.0002) * driftStrength;

  target.x += driftX;
  target.y += driftY;

  // Gentle smoothing so the camera “floats” a bit behind the target.
  const follow = 0.03; // smaller = slower/softer
  camCenter.x = lerp(camCenter.x, target.x, follow);
  camCenter.y = lerp(camCenter.y, target.y, follow);

  // Convert center → top-left offset for translate()
  cam.x = camCenter.x - width / 2;
  cam.y = camCenter.y - height / 2;

  // ---------- 2) DRAW ----------
  background(COL_BG);

  // World layer (scrolling)
  // World layer (scrolling) — cinematic transform
  push();

  translate(width / 2, height / 2);

  const zoom = 1.0 + 0.015 * sin(millis() * 0.00008);
  scale(zoom);

  translate(-width / 2, -height / 2);

  translate(-cam.x, -cam.y);

  drawWorld();
  drawDiscoverables();

  pop();

  drawDiscoveryPulses();
  drawExposureBreathing();
  drawCompletionBloom();
  drawVignette();

  // Trigger completion bloom once when all symbols are discovered
  if (!completionPlayed && discoveredCount() === discoverables.length) {
    triggerCompletionBloom();
  }

  // HUD (screen space)
  drawHUD(target);
}

function drawWorld() {
  // World background (big rectangle so it’s obvious the world is larger)
  noStroke();
  fill(238);
  rect(0, 0, WORLD_W, WORLD_H);

  // Light grid to make motion easy to perceive
  stroke(COL_GRID);
  for (let x = 0; x <= WORLD_W; x += 160) line(x, 0, x, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += 160) line(0, y, WORLD_W, y);

  // Simple “landmarks” (Commit 1: just enough structure to feel like a place)
  noStroke();

  // Soft blocks
  fill(200, 210, 222);
  for (let i = 0; i < 34; i++) {
    const x = (i * 280) % WORLD_W;
    const y = (i * 170) % WORLD_H;
    rect(x + 60, y + 60, 90, 90, 14);
  }

  // A few “islands” (circles) to break the grid monotony
  fill(214, 220, 212);
  for (let i = 0; i < 16; i++) {
    const x = (i * 410 + 200) % WORLD_W;
    const y = (i * 260 + 140) % WORLD_H;
    circle(x, y, 140);
  }
}

function drawHUD(target) {
  noStroke();

  // Title
  textSize(15);
  fill(COL_TEXT, 200);
  text(`Reflective Camera Cruise  ${VERSION}`, 28, 44);

  // Small helper text
  textSize(14);
  fill(COL_TEXT, 150);
  text("Press D for debug.", 28, 68);

  // Hide the counter after completion (optional, keeps it calm)
  if (!completionPlayed) {
    fill(COL_TEXT, 150);
    text(`Discovered ${discoveredCount()}/${discoverables.length}`, 28, 92);
  }

  // Discovery counter (low emphasis)
  fill(COL_TEXT, 150);
  text(`Discovered ${discoveredCount()}/${discoverables.length}`, 28, 92);

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
function mousePressed() {
  const wx = mouseX + cam.x;
  const wy = mouseY + cam.y;

  for (const d of discoverables) {
    if (d.found) continue;
    const onScreen =
      d.x >= cam.x &&
      d.x <= cam.x + width &&
      d.y >= cam.y &&
      d.y <= cam.y + height;

    if (!onScreen) continue;

    const distSq = (wx - d.x) * (wx - d.x) + (wy - d.y) * (wy - d.y);
    const hitR = d.r * 1.8;

    if (distSq <= hitR * hitR) {
      d.found = true;

      // Spawn a short-lived pulse at the discovery location
      pulses.push({
        x: d.x,
        y: d.y,
        t0: millis(),
      });

      break;
    }
  }
}

// --- Helpers ---
function easeInOutSine(x) {
  x = constrain(x, 0, 1);
  return -(cos(PI * x) - 1) / 2;
}

function drawVignette() {
  noFill();
  for (let i = 0; i < 14; i++) {
    const a = map(i, 0, 13, 0, 55);
    stroke(0, a);
    strokeWeight(26);
    rect(0, 0, width, height, 22);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function drawDiscoverables() {
  const t = millis() * 0.004;

  for (const d of discoverables) {
    const onScreen =
      d.x >= cam.x &&
      d.x <= cam.x + width &&
      d.y >= cam.y &&
      d.y <= cam.y + height;

    if (!onScreen) continue;

    if (d.found) {
      noStroke();
      fill(30, 120);
      circle(d.x, d.y, d.r * 1.4);
      continue;
    }

    // Revealed (not found yet):
    const pulse = 0.6 + 0.4 * sin(t + d.x * 0.01 + d.y * 0.01);

    noFill();
    stroke(30, 120 * pulse);
    strokeWeight(2);
    circle(d.x, d.y, d.r * 2.4);

    noStroke();
    fill(30, 180 * pulse);
    circle(d.x, d.y, d.r * 1.1);
  }
}

function drawDiscoveryPulses() {
  // Draw pulses in world space (so they "belong" to the world)
  push();

  // Match the same cinematic transform used for the world
  translate(width / 2, height / 2);
  const zoom = 1.0 + 0.015 * sin(millis() * 0.00008);
  scale(zoom);
  translate(-width / 2, -height / 2);
  translate(-cam.x, -cam.y);

  noFill();
  strokeWeight(2);

  const now = millis();
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    const age = now - p.t0;
    const dur = 550; // ms

    if (age > dur) {
      pulses.splice(i, 1);
      continue;
    }

    const k = age / dur; // 0..1
    const eased = 1 - pow(1 - k, 3); // easeOutCubic-ish
    const alpha = 120 * (1 - k);

    stroke(30, alpha);
    const r = 10 + 42 * eased;
    circle(p.x, p.y, r * 2);
  }

  pop();
}

function drawExposureBreathing() {
  // Very subtle global "exposure" breathing (screen space)
  // Keep it tiny so it feels like film, not flicker.
  const s = sin(millis() * 0.00006); // slow
  const a = 10 + 10 * (s * 0.5 + 0.5); // ~10..20

  noStroke();
  fill(255, a);
  rect(0, 0, width, height);
}

function nearUndiscovered() {
  for (const d of discoverables) {
    if (d.found) continue;

    const dx = camCenter.x - d.x;
    const dy = camCenter.y - d.y;
    const dist = sqrt(dx * dx + dy * dy);

    if (dist < 250) return true; // 半径可调
  }
  return false;
}
function triggerCompletionBloom() {
  completionPlayed = true;
  completionT0 = millis();

  // Spawn a small field of slow, low-contrast particles
  const count = 90;
  for (let i = 0; i < count; i++) {
    completionParticles.push({
      x: random(width),
      y: random(height),
      vx: random(-0.12, 0.12),
      vy: random(-0.25, -0.05), // gently drifting upward
      r: random(1.5, 3.2),
      a: random(40, 90),
      phase: random(TWO_PI),
    });
  }
}

function drawCompletionBloom() {
  if (!completionPlayed) return;

  const now = millis();
  const age = now - completionT0;
  const dur = 2600; // ms

  // After the bloom ends, stop drawing it
  if (age > dur) return;

  // 0..1 progress
  const k = constrain(age / dur, 0, 1);

  // Soft white wash that rises then fades (quiet "release")
  const washIn = smooth01(k / 0.25);
  const washOut = 1 - smooth01((k - 0.55) / 0.45);
  const wash = washIn * washOut;

  noStroke();
  fill(255, 18 * wash);
  rect(0, 0, width, height);

  // Particles: slow drift + subtle shimmer, then fade out
  for (const p of completionParticles) {
    p.x += p.vx;
    p.y += p.vy;

    // Wrap softly so it feels endless, not bounded
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;

    const shimmer = 0.7 + 0.3 * sin(now * 0.004 + p.phase);
    const alpha = p.a * (1 - k) * shimmer;

    fill(255, alpha);
    circle(p.x, p.y, p.r * 2);
  }
}

// Helper: smooth 0..1 with clamping
function smooth01(x) {
  x = constrain(x, 0, 1);
  return x * x * (3 - 2 * x);
}
