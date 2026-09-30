/*
 * Personalization lives here: update the answers, clues, or finale copy near
 * the top of this file without needing to change the game engine.
 */
const PUZZLES = [
  { id: "happy", answer: "HAPPY", label: "a feeling", clue: "How you make me feel" },
  { id: "three", answer: "THREE", label: "a number", clue: "What is (18 ÷ 3) − 3?" },
  { id: "month", answer: "MONTH", label: "a little chapter", clue: "One twelfth of a year" },
  { id: "anniv", answer: "ANNIV", label: "the mystery", clue: null },
];

const MAX_GUESSES = 9;
const STORAGE_KEY = "our-little-wordle-state-v1";
const FINALE_MESSAGE = "To more scratching my head bro...";

// Any five-letter entry is valid; the game scores it against every board.

const state = {
  guesses: [],
  statuses: [],
  solved: PUZZLES.map(() => false),
  gameOver: false,
  won: false,
};

const boardsElement = document.querySelector("#boards");
const statusElement = document.querySelector("#status");
const progressElement = document.querySelector("#progress-text");
const attemptElement = document.querySelector("#attempt-text");
const gameCardElement = document.querySelector(".game-card");
const finaleElement = document.querySelector("#finale");
const guessInput = document.querySelector("#guess-input");
const guessTrayElement = document.querySelector("#guess-tray");
const failureModal = document.querySelector("#failure-modal");
const modalRestartButton = document.querySelector("#modal-restart-button");
const failureDismissButton = document.querySelector("#failure-dismiss-button");
const failureReviewButton = document.querySelector("#failure-review-button");
document.querySelector("#finale-message").textContent = FINALE_MESSAGE;

let failureModalTimer;
let lastFocusedElement;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.guesses) || !Array.isArray(saved.statuses)) return;
    state.guesses = saved.guesses.filter((guess) => typeof guess === "string").slice(0, MAX_GUESSES);
    state.statuses = saved.statuses.slice(0, state.guesses.length);
    state.solved = PUZZLES.map((puzzle) => state.guesses.some((guess) => guess === puzzle.answer));
    state.won = state.solved.every(Boolean);
    state.gameOver = state.won || state.guesses.length >= MAX_GUESSES;
  } catch {
    // A blocked or malformed localStorage should never stop the game.
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ guesses: state.guesses, statuses: state.statuses }));
  } catch {
    // Persistence is a convenience, not a requirement.
  }
}

function createBoard(puzzle, boardIndex) {
  const board = document.createElement("article");
  board.className = "board";
  board.dataset.boardIndex = boardIndex;
  board.setAttribute("aria-label", `${puzzle.answer.length}-letter board for ${puzzle.label}`);
  const boardTitle = puzzle.id === "anniv" ? "final word" : `word ${boardIndex + 1}`;

  const clueMarkup = puzzle.clue
    ? `<button class="clue-button" type="button" aria-expanded="false">tap for a clue</button><p class="clue-text">${puzzle.clue}</p>`
    : `<span class="mystery-label">one last secret</span>`;
  board.innerHTML = `
    <div class="board-top">
    <p class="board-label">${boardTitle} <span>· ${puzzle.label}</span></p>
      ${clueMarkup}
    </div>
    <div class="grid" role="grid" aria-label="${puzzle.id} guesses"></div>
  `;

  const clueButton = board.querySelector(".clue-button");
  if (clueButton) {
    clueButton.addEventListener("click", () => {
      const clueText = board.querySelector(".clue-text");
      const isVisible = clueText.classList.toggle("is-visible");
      clueButton.textContent = isVisible ? "hide clue" : "tap for a clue";
      clueButton.setAttribute("aria-expanded", String(isVisible));
    });
  }
  return board;
}

function renderBoards() {
  boardsElement.innerHTML = "";
  PUZZLES.forEach((puzzle, boardIndex) => boardsElement.appendChild(createBoard(puzzle, boardIndex)));
  const boardElements = [...boardsElement.querySelectorAll(".board")];
  boardElements.forEach((board, boardIndex) => {
    const grid = board.querySelector(".grid");
    for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
      const row = document.createElement("div");
      row.className = "grid-row";
      row.setAttribute("role", "row");
      row.setAttribute("aria-label", `Guess ${rowIndex + 1}`);
      for (let letterIndex = 0; letterIndex < 5; letterIndex += 1) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.setAttribute("role", "gridcell");
        tile.setAttribute("aria-label", "empty");
        tile.dataset.row = rowIndex;
        tile.dataset.letter = letterIndex;
        row.appendChild(tile);
      }
      grid.appendChild(row);
    }
    if (state.solved[boardIndex]) board.classList.add("is-solved");
  });
  renderHistory();
}

function renderHistory() {
  const boardElements = [...boardsElement.querySelectorAll(".board")];
  boardElements.forEach((board, boardIndex) => {
    const puzzle = PUZZLES[boardIndex];
    const tiles = [...board.querySelectorAll(".tile")];
    state.guesses.forEach((guess, rowIndex) => {
      const result = scoreGuess(guess, puzzle.answer);
      [...guess].forEach((letter, letterIndex) => updateTile(tiles[rowIndex * 5 + letterIndex], letter, result[letterIndex], false));
    });
    if (state.solved[boardIndex]) board.classList.add("is-solved");
  });
}

function scoreGuess(guess, answer) {
  const result = Array(5).fill("gray");
  const remaining = answer.split("");
  [...guess].forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index] = "green";
      remaining[index] = null;
    }
  });
  [...guess].forEach((letter, index) => {
    if (result[index] === "green") return;
    const foundIndex = remaining.indexOf(letter);
    if (foundIndex !== -1) {
      result[index] = "yellow";
      remaining[foundIndex] = null;
    }
  });
  return result;
}

function updateTile(tile, letter, status, animate = true) {
  tile.textContent = letter;
  tile.className = `tile is-${status}`;
  tile.setAttribute("aria-label", `${letter}, ${status}`);
  if (animate) tile.classList.add("is-flipping");
}

function renderCurrentGuess() {
  const currentGuess = state.currentGuess || "";
  const rowIndex = state.guesses.length;
  boardsElement.querySelectorAll(".board").forEach((board) => {
    [...board.querySelectorAll(`.grid-row:nth-child(${rowIndex + 1}) .tile`)].forEach((tile, index) => {
      const letter = currentGuess[index] || "";
      tile.textContent = letter;
      tile.className = letter ? "tile is-filled" : "tile";
      tile.setAttribute("aria-label", letter ? `${letter}, current guess` : "empty");
    });
  });
  renderGuessTray();
}

function renderGuessTray() {
  const currentGuess = state.currentGuess || "";
  [...guessTrayElement.querySelectorAll(".guess-slot")].forEach((slot, index) => {
    const letter = currentGuess[index] || "";
    slot.textContent = letter;
    slot.className = letter ? "guess-slot is-filled" : "guess-slot";
  });
  guessTrayElement.setAttribute("aria-label", currentGuess ? `Current guess: ${[...currentGuess].join(" ")}` : "Current guess, empty");
}

function updateHeader() {
  const solvedCount = state.solved.filter(Boolean).length;
  progressElement.textContent = `${solvedCount} / 4 solved`;
  attemptElement.textContent = `${state.guesses.length} / ${MAX_GUESSES} guesses`;
}

function handleKey(key) {
  if (state.gameOver) return;
  if (key === "ENTER") submitGuess();
  else if (key === "BACKSPACE") {
    state.currentGuess = (state.currentGuess || "").slice(0, -1);
    guessInput.value = state.currentGuess;
    renderCurrentGuess();
    setStatus("");
  } else if (/^[A-Z]$/.test(key) && (state.currentGuess || "").length < 5) {
    state.currentGuess = `${state.currentGuess || ""}${key}`;
    guessInput.value = state.currentGuess;
    renderCurrentGuess();
    setStatus("");
  }
}

function submitGuess() {
  const guess = state.currentGuess || "";
  if (guess.length !== 5) {
    setStatus("Your guess needs five letters ✿");
    shakeBoards();
    return;
  }
  const rowIndex = state.guesses.length;
  state.guesses.push(guess);
  state.statuses.push(PUZZLES.map((puzzle) => scoreGuess(guess, puzzle.answer)));
  state.currentGuess = "";
  guessInput.value = "";
  renderGuessTray();
  PUZZLES.forEach((puzzle, boardIndex) => {
    if (guess === puzzle.answer) state.solved[boardIndex] = true;
    const board = boardsElement.querySelector(`[data-board-index="${boardIndex}"]`);
    const tiles = [...board.querySelectorAll(".tile")].slice(rowIndex * 5, rowIndex * 5 + 5);
    scoreGuess(guess, puzzle.answer).forEach((result, letterIndex) => updateTile(tiles[letterIndex], guess[letterIndex], result));
    if (state.solved[boardIndex]) board.classList.add("is-solved");
  });
  saveState();
  updateHeader();
  if (state.solved.every(Boolean)) {
    state.won = true;
    state.gameOver = true;
    setStatus("All four found — I knew you could do it! ♥");
    window.setTimeout(showFinale, 900);
  } else if (state.guesses.length >= MAX_GUESSES) {
    state.gameOver = true;
    setStatus("So close! Start over and try again for the big reveal ✿");
    failureModalTimer = window.setTimeout(showFailureModal, 450);
  } else {
    const remaining = PUZZLES.length - state.solved.filter(Boolean).length;
    setStatus(`${remaining} little ${remaining === 1 ? "word" : "words"} still hiding ✿`);
  }
}

function shakeBoards() {
  boardsElement.querySelectorAll(".board").forEach((board) => {
    board.classList.remove("is-shaking");
    void board.offsetWidth;
    board.classList.add("is-shaking");
  });
}

function setStatus(message) { statusElement.textContent = message; }

function showFailureModal() {
  if (state.won || !state.gameOver) return;
  lastFocusedElement = document.activeElement;
  failureModal.hidden = false;
  document.body.classList.add("modal-open");
  modalRestartButton.focus();
}

function hideFailureModal({ restoreFocus = true } = {}) {
  failureModal.hidden = true;
  document.body.classList.remove("modal-open");
  const focusTarget = lastFocusedElement;
  lastFocusedElement = null;
  if (restoreFocus && focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
}

function resetGame() {
  window.clearTimeout(failureModalTimer);
  hideFailureModal({ restoreFocus: false });
  state.guesses = [];
  state.statuses = [];
  state.solved = PUZZLES.map(() => false);
  state.gameOver = false;
  state.won = false;
  state.currentGuess = "";
  guessInput.value = "";
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
  finaleElement.hidden = true;
  gameCardElement.hidden = false;
  renderBoards();
  renderCurrentGuess();
  updateHeader();
  setStatus("Fresh start! I’m cheering for you ♥");
}

function showFinale() {
  hideFailureModal({ restoreFocus: false });
  gameCardElement.hidden = true;
  finaleElement.hidden = false;
  finaleElement.scrollIntoView({ behavior: "smooth", block: "center" });
}

function focusGuessInput() {
  if (!state.gameOver) guessInput.focus({ preventScroll: true });
}

guessInput.addEventListener("input", () => {
  const cleaned = guessInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
  guessInput.value = cleaned;
  state.currentGuess = cleaned;
  renderCurrentGuess();
  setStatus("");
});

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  }
});

boardsElement.addEventListener("click", (event) => {
  if (!event.target.closest(".clue-button")) focusGuessInput();
});

document.addEventListener("keydown", (event) => {
  if (event.target === guessInput) return;
  if (event.key === "Enter") handleKey("ENTER");
  else if (event.key === "Backspace") handleKey("BACKSPACE");
  else if (/^[a-zA-Z]$/.test(event.key)) handleKey(event.key.toUpperCase());
});

document.querySelector("#restart-button").addEventListener("click", resetGame);
document.querySelector("#play-again-button").addEventListener("click", resetGame);
modalRestartButton.addEventListener("click", resetGame);
failureDismissButton.addEventListener("click", hideFailureModal);
failureReviewButton.addEventListener("click", hideFailureModal);
failureModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-modal-dismiss]")) hideFailureModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !failureModal.hidden) hideFailureModal();
});

loadState();
renderBoards();
renderCurrentGuess();
updateHeader();
if (state.won) showFinale();
else if (state.gameOver) {
  setStatus("This round is over — start over for another try ✿");
  failureModalTimer = window.setTimeout(showFailureModal, 250);
}
else setStatus("Pick a word and let the butterflies begin ✿");
