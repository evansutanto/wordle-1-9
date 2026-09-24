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
const FINALE_MESSAGE = "Three months with you already feels like the sweetest little adventure. I love you more every day. 💕";

// A compact, common five-letter dictionary keeps the page self-contained.
// The four private answers are explicitly added below, including ANNIV.
const WORDS = new Set(`
about above abuse actor acute adapt admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise armor array aside asset audio audit avoid award aware awful bacon badge badly baker basic beach began begin being below bench berry birth black blade blame blank blast blaze bleak blend bless blind block blood bloom blown board boast bonus booth bound brain brake brand brave bread break brick bride brief bring broad broke brown brush build built bunch burst buyer cable candy carry catch cause chain chair chalk champ chaos charm chart chase cheap check cheek cheer chess chief child china chose church cigar civil claim class clean clear clerk click climb clock close cloth cloud coach coast color comic comma coral couch could count court cover craft crash crazy cream crime crisp cross crowd crown crude crush curve cycle daily dairy dealt death debut delay depth devil diary dirty doubt dozen draft drama drawn dream dress drill drink drive dwarf eager early earth eight elbow elite empty enemy enjoy enter entry equal error event every exact extra faith false fancy fatal fault favor feast fence fewer fiber field fifth fifty fight final first fixed flame flash fleet floor flour focus force frame frank fraud fresh front frost fruit funny giant given glass globe glory glove going grace grade grain grand grant grape graph grasp grass great green greet grief grind gross group grove grown guard guess guest guide habit happy harsh haste haven heart heavy hello hence honey honor horse hotel house human humor ideal image imply index inner input intro issue ivory jelly jewel joint judge juice juicy knock known label labor large later laugh layer learn lease least leave legal lemon level light limit local logic loose lucky lunch magic major maker maple march marry match maybe mayor medal media medic mercy merry metal meter might minor minus model money month moral motor mount mouse movie music naive nerve never newly night noble noise north noted novel nurse occur ocean offer often olive onion opera order other ought outer owner paint panel panic paper party pasta patch pause peace peach pearl penny phase phone photo piano piece pilot pitch place plain plane plant plate point power press price pride prime print prize proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready realm rebel refer relax reply right rival river roast robot rough round route royal rural saint salad sauce scale scare scene scent scope score scout scrap screw serve setup seven shade shake shame shape share shark sharp sheet shelf shell shift shine shirt shock shoot short shout shown sight since sixth sixty skate skill skirt sleep slice slide small smart smell smile smoke snack snake solar solid solve sorry sound south space spare speak spear speed spell spend spent spice spite split sport spray squad stack staff stage stair stake stand start state steam steel steep steer stick still stock stone stood store storm story strip stuck study stuff style sugar suite sunny super sweet swing table taken taste teach tears teeth thank their theme there thick thing think third those three threw throw tight timer tired title toast today token topic total touch tough tower trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice uncle under union unity until upper upset urban usage usual valid value video visit vital vivid voice waste watch water wheel where which while white whole whose woman women worry worth would wound write wrong yacht young youth`.split(/\s+/).filter(Boolean));
PUZZLES.forEach(({ answer }) => WORDS.add(answer.toLowerCase()));

const state = {
  guesses: [],
  statuses: [],
  solved: PUZZLES.map(() => false),
  gameOver: false,
  won: false,
};

const boardsElement = document.querySelector("#boards");
const keyboardElement = document.querySelector("#keyboard");
const statusElement = document.querySelector("#status");
const progressElement = document.querySelector("#progress-text");
const attemptElement = document.querySelector("#attempt-text");
const gameCardElement = document.querySelector(".game-card");
const finaleElement = document.querySelector("#finale");
document.querySelector("#finale-message").textContent = FINALE_MESSAGE;

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
}

function updateHeader() {
  const solvedCount = state.solved.filter(Boolean).length;
  progressElement.textContent = `${solvedCount} / 4 solved`;
  attemptElement.textContent = `${state.guesses.length} / ${MAX_GUESSES} guesses`;
}

function renderKeyboard() {
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  keyboardElement.innerHTML = rows.map((row, rowIndex) => `
    <div class="keyboard-row">
      ${rowIndex === 2 ? `<button type="button" class="key wide" data-key="BACKSPACE" aria-label="Backspace">⌫</button>` : ""}
      ${[...row].map((letter) => `<button type="button" class="key" data-key="${letter}">${letter}</button>`).join("")}
      ${rowIndex === 2 ? `<button type="button" class="key wide" data-key="ENTER">enter</button>` : ""}
    </div>
  `).join("");
  keyboardElement.querySelectorAll(".key").forEach((key) => key.addEventListener("click", () => handleKey(key.dataset.key)));
  updateKeyboardStatuses();
}

function updateKeyboardStatuses() {
  const priorities = { gray: 1, yellow: 2, green: 3 };
  const statuses = {};
  state.guesses.forEach((guess) => {
    PUZZLES.forEach((puzzle) => {
      scoreGuess(guess, puzzle.answer).forEach((result, index) => {
        const letter = guess[index];
        if (!statuses[letter] || priorities[result] > priorities[statuses[letter]]) statuses[letter] = result;
      });
    });
  });
  keyboardElement.querySelectorAll(".key").forEach((key) => {
    const letterStatus = statuses[key.dataset.key];
    key.classList.remove("is-gray", "is-yellow", "is-green");
    if (letterStatus) key.classList.add(`is-${letterStatus}`);
  });
}

function handleKey(key) {
  if (state.gameOver) return;
  if (key === "ENTER") submitGuess();
  else if (key === "BACKSPACE") {
    state.currentGuess = (state.currentGuess || "").slice(0, -1);
    renderCurrentGuess();
    setStatus("");
  } else if (/^[A-Z]$/.test(key) && (state.currentGuess || "").length < 5) {
    state.currentGuess = `${state.currentGuess || ""}${key}`;
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
  if (!WORDS.has(guess.toLowerCase())) {
    setStatus("That one isn't in my little dictionary yet ✿");
    shakeBoards();
    return;
  }

  const rowIndex = state.guesses.length;
  state.guesses.push(guess);
  state.statuses.push(PUZZLES.map((puzzle) => scoreGuess(guess, puzzle.answer)));
  state.currentGuess = "";
  PUZZLES.forEach((puzzle, boardIndex) => {
    if (guess === puzzle.answer) state.solved[boardIndex] = true;
    const board = boardsElement.querySelector(`[data-board-index="${boardIndex}"]`);
    const tiles = [...board.querySelectorAll(".tile")].slice(rowIndex * 5, rowIndex * 5 + 5);
    scoreGuess(guess, puzzle.answer).forEach((result, letterIndex) => updateTile(tiles[letterIndex], guess[letterIndex], result));
    if (state.solved[boardIndex]) board.classList.add("is-solved");
  });
  saveState();
  updateHeader();
  updateKeyboardStatuses();

  if (state.solved.every(Boolean)) {
    state.won = true;
    state.gameOver = true;
    setStatus("All four found — I knew you could do it! ♥");
    window.setTimeout(showFinale, 900);
  } else if (state.guesses.length >= MAX_GUESSES) {
    state.gameOver = true;
    setStatus("So close! Start over and try again for the big reveal ✿");
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

function resetGame() {
  state.guesses = [];
  state.statuses = [];
  state.solved = PUZZLES.map(() => false);
  state.gameOver = false;
  state.won = false;
  state.currentGuess = "";
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
  finaleElement.hidden = true;
  gameCardElement.hidden = false;
  renderBoards();
  updateHeader();
  renderKeyboard();
  setStatus("Fresh start! I’m cheering for you ♥");
}

function showFinale() {
  gameCardElement.hidden = true;
  finaleElement.hidden = false;
  finaleElement.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleKey("ENTER");
  else if (event.key === "Backspace") handleKey("BACKSPACE");
  else if (/^[a-zA-Z]$/.test(event.key)) handleKey(event.key.toUpperCase());
});

document.querySelector("#restart-button").addEventListener("click", resetGame);
document.querySelector("#play-again-button").addEventListener("click", resetGame);

loadState();
renderBoards();
updateHeader();
renderKeyboard();
if (state.won) showFinale();
else if (state.gameOver) setStatus("This round is over — start over for another try ✿");
else setStatus("Pick a word and let the butterflies begin ✿");
