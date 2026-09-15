const SIZE = 4;
const SOLVED = Array.from({ length: 15 }, (_, index) => index + 1).concat(0);

const board = document.querySelector("#puzzleBoard");
const moveCount = document.querySelector("#moveCount");
const timer = document.querySelector("#timer");
const bestScore = document.querySelector("#bestScore");
const boardStatus = document.querySelector("#boardStatus");
const shuffleButton = document.querySelector("#shuffleButton");
const resetButton = document.querySelector("#resetButton");
const soundButton = document.querySelector("#soundButton");
const winDialog = document.querySelector("#winDialog");
const resultText = document.querySelector("#resultText");
const playAgainButton = document.querySelector("#playAgainButton");

let tiles = [...SOLVED];
let startingTiles = [...SOLVED];
let moves = 0;
let seconds = 0;
let timerId = null;
let gameStarted = false;
let soundEnabled = true;
let audioContext = null;

function row(index) { return Math.floor(index / SIZE); }
function col(index) { return index % SIZE; }
function isAdjacent(a, b) { return Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1; }
function isSolved() { return tiles.every((tile, index) => tile === SOLVED[index]); }

function formatTime(value) {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const remainingSeconds = (value % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function updateStats() {
  moveCount.textContent = moves;
  timer.textContent = formatTime(seconds);
  const best = localStorage.getItem("hitoyasumi-best");
  bestScore.textContent = best ?? "—";
}

function startTimer() {
  if (timerId) return;
  timerId = window.setInterval(() => {
    seconds += 1;
    timer.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
}

function playTone(frequency = 300, duration = 0.045) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function tileTransform(index) {
  const gap = 12;
  return `translate(calc(${col(index) * 100}% + ${col(index) * gap}px), calc(${row(index) * 100}% + ${row(index) * gap}px))`;
}

function render() {
  const existing = new Map([...board.children].map((element) => [Number(element.dataset.value), element]));

  tiles.forEach((value, index) => {
    if (value === 0) return;
    let tile = existing.get(value);
    if (!tile) {
      tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.value = value;
      tile.setAttribute("role", "gridcell");
      tile.addEventListener("click", () => moveTile(value));
      board.append(tile);
    }
    tile.textContent = value;
    tile.style.transform = tileTransform(index);
    tile.classList.toggle("correct", value === index + 1);
    tile.setAttribute("aria-label", `タイル ${value}、${row(index) + 1}行${col(index) + 1}列`);
  });
}

function moveTile(value) {
  const tileIndex = tiles.indexOf(value);
  const emptyIndex = tiles.indexOf(0);
  const element = board.querySelector(`[data-value="${value}"]`);

  if (!isAdjacent(tileIndex, emptyIndex)) {
    element?.classList.remove("bump");
    window.requestAnimationFrame(() => element?.classList.add("bump"));
    playTone(145, 0.03);
    return false;
  }

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
  moves += 1;
  playTone(330 + value * 4);
  updateStats();
  render();
  boardStatus.textContent = `タイル${value}を移動しました。現在${moves}手です。`;

  if (isSolved()) finishGame();
  return true;
}

function shuffledBoard() {
  const result = [...SOLVED];
  let emptyIndex = result.indexOf(0);
  let previousEmpty = -1;

  for (let step = 0; step < 180; step += 1) {
    const neighbors = result
      .map((_, index) => index)
      .filter((index) => isAdjacent(index, emptyIndex) && index !== previousEmpty);
    const nextIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
    [result[emptyIndex], result[nextIndex]] = [result[nextIndex], result[emptyIndex]];
    previousEmpty = emptyIndex;
    emptyIndex = nextIndex;
  }
  return result.every((tile, index) => tile === SOLVED[index]) ? shuffledBoard() : result;
}

function beginNewGame() {
  stopTimer();
  tiles = shuffledBoard();
  startingTiles = [...tiles];
  moves = 0;
  seconds = 0;
  gameStarted = false;
  updateStats();
  render();
  boardStatus.textContent = "新しい盤面にまぜなおしました。";
}

function resetGame() {
  stopTimer();
  tiles = [...startingTiles];
  moves = 0;
  seconds = 0;
  gameStarted = false;
  updateStats();
  render();
  boardStatus.textContent = "最初の盤面に戻しました。";
}

function finishGame() {
  stopTimer();
  gameStarted = false;
  const previousBest = Number(localStorage.getItem("hitoyasumi-best")) || Infinity;
  if (moves < previousBest) localStorage.setItem("hitoyasumi-best", String(moves));
  updateStats();
  resultText.textContent = `${moves}手・${formatTime(seconds)}で完成です。`;
  playTone(523, 0.12);
  window.setTimeout(() => playTone(659, 0.15), 120);
  winDialog.showModal();
}

function handleKeyboard(event) {
  const directions = {
    ArrowUp: [1, 0],
    ArrowDown: [-1, 0],
    ArrowLeft: [0, 1],
    ArrowRight: [0, -1],
  };
  if (!directions[event.key] || winDialog.open) return;
  event.preventDefault();
  const emptyIndex = tiles.indexOf(0);
  const [rowOffset, colOffset] = directions[event.key];
  const targetRow = row(emptyIndex) + rowOffset;
  const targetCol = col(emptyIndex) + colOffset;
  if (targetRow < 0 || targetRow >= SIZE || targetCol < 0 || targetCol >= SIZE) return;
  moveTile(tiles[targetRow * SIZE + targetCol]);
}

shuffleButton.addEventListener("click", beginNewGame);
resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", () => { winDialog.close(); beginNewGame(); });
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  soundButton.querySelector("span").textContent = soundEnabled ? "サウンド" : "ミュート";
  if (soundEnabled) playTone(420);
});
document.addEventListener("keydown", handleKeyboard);

beginNewGame();
