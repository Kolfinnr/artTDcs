// Bunker Crew Prototype
// Simple HTML5 Canvas game with station interactions and arrow-combo minigames.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game world dimensions (matches canvas size).
const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

// Input state for movement and interactions.
const keysDown = new Set();

// Arrow key mappings for combo logic.
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const ARROW_SYMBOL = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

// Core game state.
const gameState = {
  ammoHeld: false,
  cannonLoaded: false,
  cannonUnlocked: false,
  bunkerDamage: 0,
  enemyTimer: 20,
  enemyTimerMax: 20,

  // Stun handling.
  isStunned: false,
  stunTimeLeft: 0,

  // Minigame state.
  activeCombo: null,
  comboProgress: 0,

  // Feedback text.
  message: 'Move to a station and press E to interact.',
  messageTimer: 0,
};

// Player state.
const player = {
  x: 140,
  y: 400,
  width: 18,
  height: 36,
  speed: 180,
};

// Station definitions.
const stations = [
  { name: 'Ammo Rack', x: 90, y: 90, w: 150, h: 80, comboLength: 3, damaged: false },
  { name: 'Breech', x: 340, y: 250, w: 170, h: 80, comboLength: 4, damaged: false },
  { name: 'Gun Lock', x: 560, y: 180, w: 170, h: 80, comboLength: 5, damaged: false },
  { name: 'Fire Lever', x: 760, y: 320, w: 140, h: 90, comboLength: 3, damaged: false },
  { name: 'Repair Station', x: 110, y: 330, w: 180, h: 90, comboLength: 7, damaged: false },
];

// ---------- Utility Functions ----------

function setMessage(text, duration = 2.2) {
  gameState.message = text;
  gameState.messageTimer = duration;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceToStation(station) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  const sx = station.x + station.w / 2;
  const sy = station.y + station.h / 2;
  return Math.hypot(px - sx, py - sy);
}

function getNearestStation(maxDistance = 115) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const station of stations) {
    const d = distanceToStation(station);
    if (d < nearestDist && d <= maxDistance) {
      nearest = station;
      nearestDist = d;
    }
  }

  return nearest;
}

function randomArrowSequence(length) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    const key = ARROW_KEYS[Math.floor(Math.random() * ARROW_KEYS.length)];
    seq.push(key);
  }
  return seq;
}

function startCombo(station) {
  // If station is damaged, it can't be used unless we're repairing via Repair Station.
  if (station.damaged) {
    setMessage(`${station.name} is damaged. Repair it first.`);
    return;
  }

  // Lock out non-repair interactions when stunned.
  if (gameState.isStunned) {
    setMessage('You are stunned and cannot operate stations.');
    return;
  }

  // Generate combo for this interaction.
  gameState.activeCombo = {
    stationName: station.name,
    sequence: randomArrowSequence(station.comboLength),
  };
  gameState.comboProgress = 0;
  setMessage(`Combo started: ${station.name}`);
}

function handleComboKey(key) {
  if (!gameState.activeCombo) return;

  const expected = gameState.activeCombo.sequence[gameState.comboProgress];
  if (key === expected) {
    gameState.comboProgress += 1;

    if (gameState.comboProgress >= gameState.activeCombo.sequence.length) {
      completeStationAction(gameState.activeCombo.stationName);
      gameState.activeCombo = null;
      gameState.comboProgress = 0;
    }
  } else {
    // Wrong input resets the combo progress (requirement).
    gameState.comboProgress = 0;
    setMessage('Wrong key! Combo reset.');
  }
}

function completeStationAction(stationName) {
  if (stationName === 'Ammo Rack') {
    gameState.ammoHeld = true;
    setMessage('You grabbed a shell from Ammo Rack.');
    return;
  }

  if (stationName === 'Breech') {
    if (!gameState.ammoHeld) {
      setMessage('No shell in hand. Visit Ammo Rack first.');
      return;
    }
    gameState.ammoHeld = false;
    gameState.cannonLoaded = true;
    setMessage('Shell loaded into the breech.');
    return;
  }

  if (stationName === 'Gun Lock') {
    gameState.cannonUnlocked = true;
    setMessage('Gun lock disengaged. Cannon unlocked.');
    return;
  }

  if (stationName === 'Fire Lever') {
    if (!gameState.cannonLoaded || !gameState.cannonUnlocked) {
      setMessage('Cannot fire: cannon must be loaded and unlocked.');
      return;
    }
    // Fire cannon and reset relevant state.
    gameState.cannonLoaded = false;
    gameState.cannonUnlocked = false;
    // Reward by delaying next enemy shot a little.
    gameState.enemyTimer = Math.min(gameState.enemyTimer + 4, gameState.enemyTimerMax);
    setMessage('BOOM! Cannon fired. Enemy barrage delayed.');
    return;
  }

  if (stationName === 'Repair Station') {
    const damagedList = stations.filter((s) => s.name !== 'Repair Station' && s.damaged);
    if (damagedList.length === 0) {
      setMessage('Nothing to repair right now.');
      return;
    }

    // Repair one random damaged station.
    const target = damagedList[Math.floor(Math.random() * damagedList.length)];
    target.damaged = false;
    setMessage(`${target.name} repaired.`);
  }
}

function enemyStrike() {
  gameState.bunkerDamage += 1;
  gameState.enemyTimer = gameState.enemyTimerMax;

  // Apply stun.
  gameState.isStunned = true;
  gameState.stunTimeLeft = 3;

  // Randomly damage one non-repair station.
  const candidates = stations.filter((s) => s.name !== 'Repair Station');
  const victim = candidates[Math.floor(Math.random() * candidates.length)];
  victim.damaged = true;

  // Cancel any active combo because the crew is interrupted.
  gameState.activeCombo = null;
  gameState.comboProgress = 0;

  setMessage(`Enemy shell hit! ${victim.name} damaged. You are stunned.`);
}

// ---------- Input Handling ----------

document.addEventListener('keydown', (event) => {
  const { key } = event;

  // Prevent browser scrolling on arrows/space.
  if (ARROW_KEYS.includes(key) || key === ' ') {
    event.preventDefault();
  }

  // Arrow keys are routed into the combo minigame.
  if (ARROW_KEYS.includes(key)) {
    handleComboKey(key);
    return;
  }

  keysDown.add(key.toLowerCase());

  // Interact key: E.
  if (key.toLowerCase() === 'e') {
    if (gameState.activeCombo) {
      setMessage('Finish current combo first.');
      return;
    }

    const nearby = getNearestStation();
    if (!nearby) {
      setMessage('No station nearby. Move closer.');
      return;
    }

    startCombo(nearby);
  }
});

document.addEventListener('keyup', (event) => {
  keysDown.delete(event.key.toLowerCase());
});

// ---------- Update & Render ----------

function update(dt) {
  // Update message display timer.
  if (gameState.messageTimer > 0) {
    gameState.messageTimer -= dt;
    if (gameState.messageTimer <= 0) {
      gameState.message = '';
    }
  }

  // Enemy artillery countdown.
  gameState.enemyTimer -= dt;
  if (gameState.enemyTimer <= 0) {
    enemyStrike();
  }

  // Stun countdown.
  if (gameState.isStunned) {
    gameState.stunTimeLeft -= dt;
    if (gameState.stunTimeLeft <= 0) {
      gameState.isStunned = false;
      gameState.stunTimeLeft = 0;
      setMessage('Recovered from stun.');
    }
    return; // Player cannot move while stunned.
  }

  // Movement with WASD.
  let dx = 0;
  let dy = 0;
  if (keysDown.has('w')) dy -= 1;
  if (keysDown.has('s')) dy += 1;
  if (keysDown.has('a')) dx -= 1;
  if (keysDown.has('d')) dx += 1;

  // Normalize diagonal movement.
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  // Keep player inside bunker bounds.
  player.x = clamp(player.x, 20, WORLD.width - player.width - 20);
  player.y = clamp(player.y, 20, WORLD.height - player.height - 20);
}

function drawStation(station) {
  const isNearby = getNearestStation(115) === station;
  const stationGrad = ctx.createLinearGradient(station.x, station.y, station.x, station.y + station.h);
  stationGrad.addColorStop(0, station.damaged ? '#8c2f2f' : '#4e667d');
  stationGrad.addColorStop(1, station.damaged ? '#5b1e1e' : '#324354');
  ctx.fillStyle = stationGrad;
  ctx.fillRect(station.x, station.y, station.w, station.h);

  ctx.strokeStyle = isNearby ? '#f1c40f' : '#99a8b8';
  ctx.lineWidth = isNearby ? 3 : 2;
  ctx.strokeRect(station.x, station.y, station.w, station.h);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText(station.name, station.x + 8, station.y + 24);

  if (station.damaged) {
    ctx.fillStyle = '#ff9d9d';
    ctx.fillText('DAMAGED', station.x + 8, station.y + 46);
  }
}

function drawPlayer() {
  const cx = player.x + player.width / 2;
  const top = player.y;
  const bottom = player.y + player.height;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;

  // Head (simple circle).
  ctx.beginPath();
  ctx.arc(cx, top + 6, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Body vertical line.
  ctx.beginPath();
  ctx.moveTo(cx, top + 11);
  ctx.lineTo(cx, bottom - 6);
  ctx.stroke();

  // Horizontal arms line (H-like stick figure style).
  ctx.beginPath();
  ctx.moveTo(cx - 8, top + 20);
  ctx.lineTo(cx + 8, top + 20);
  ctx.stroke();
}

function drawCannon() {
  // Stylized cannon with base, wheel, and barrel glow.
  ctx.strokeStyle = '#1f1f1f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(500, 300);
  ctx.lineTo(710, 215);
  ctx.stroke();

  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(505, 297);
  ctx.lineTo(708, 217);
  ctx.stroke();

  ctx.fillStyle = '#3c3c3c';
  ctx.fillRect(462, 298, 85, 28);

  ctx.beginPath();
  ctx.fillStyle = '#272727';
  ctx.arc(480, 328, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = '#555';
  ctx.arc(480, 328, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackgroundDetails() {
  // Back wall gradient and bunker ribs for extra visual depth.
  const wallGrad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  wallGrad.addColorStop(0, '#38444f');
  wallGrad.addColorStop(1, '#242d35');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.17)';
  for (let x = 40; x < WORLD.width; x += 90) {
    ctx.fillRect(x, 70, 16, 320);
  }

  // Floor striping for orientation.
  ctx.fillStyle = '#394550';
  ctx.fillRect(0, 380, WORLD.width, 160);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let x = 0; x < WORLD.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 420);
    ctx.lineTo(x + 30, 540);
    ctx.stroke();
  }
}

function drawHUD() {
  ctx.fillStyle = '#10161d';
  ctx.fillRect(0, 0, WORLD.width, 70);

  ctx.fillStyle = '#dce8f2';
  ctx.font = '16px Arial';
  ctx.fillText(`Enemy Timer: ${gameState.enemyTimer.toFixed(1)}s`, 16, 24);
  ctx.fillText(`Bunker Damage: ${gameState.bunkerDamage}`, 16, 46);

  ctx.fillText(`Shell Held: ${gameState.ammoHeld ? 'YES' : 'NO'}`, 250, 24);
  ctx.fillText(`Loaded: ${gameState.cannonLoaded ? 'YES' : 'NO'}`, 250, 46);

  ctx.fillText(`Unlocked: ${gameState.cannonUnlocked ? 'YES' : 'NO'}`, 430, 24);
  ctx.fillText(`Stunned: ${gameState.isStunned ? `${gameState.stunTimeLeft.toFixed(1)}s` : 'NO'}`, 430, 46);

  if (gameState.message) {
    ctx.fillStyle = '#f8e287';
    ctx.fillText(gameState.message, 620, 24);
  }
}

function drawComboUI() {
  if (!gameState.activeCombo) return;

  const panelX = 590;
  const panelY = 420;
  const panelW = 350;
  const panelH = 100;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.fillText(`Combo: ${gameState.activeCombo.stationName}`, panelX + 12, panelY + 24);

  // Render each arrow in sequence, highlighting completed/progressed items.
  const seq = gameState.activeCombo.sequence;
  let x = panelX + 12;
  const y = panelY + 62;

  for (let i = 0; i < seq.length; i++) {
    if (i < gameState.comboProgress) {
      ctx.fillStyle = '#7CFC00';
    } else if (i === gameState.comboProgress) {
      ctx.fillStyle = '#ffd166';
    } else {
      ctx.fillStyle = '#d9e2ec';
    }

    ctx.font = '28px Arial';
    ctx.fillText(ARROW_SYMBOL[seq[i]], x, y);
    x += 36;
  }
}

function render() {
  // Bunker interior background.
  drawBackgroundDetails();

  drawCannon();

  for (const station of stations) {
    drawStation(station);
  }

  drawPlayer();
  drawHUD();
  drawComboUI();
}

let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
