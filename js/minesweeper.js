const ROWS = 9;
const COLS = 9;
const MINES = 10;
const TOTAL = ROWS * COLS;

export function initMinesweeper({ openWindow }) {
  const grid = document.getElementById('msGrid');
  const minesLed = document.getElementById('msMines');
  const timerLed = document.getElementById('msTimer');
  const face = document.getElementById('msFace');
  const status = document.getElementById('msStatus');
  const win = document.getElementById('msWin');
  let cells;
  let mine;
  let revealed;
  let flagged;
  let counts;
  let started;
  let over;
  let revealedCount;
  let flags;
  let timer;
  let timerId;
  let activeIndex;
  let pressTimer = null;
  let longPressed = false;

  const pad = (number) => String(Math.max(0, Math.min(999, number))).padStart(3, '0');
  const indexOf = (row, column) => row * COLS + column;
  const inBounds = (row, column) => row >= 0 && row < ROWS && column >= 0 && column < COLS;
  const position = (index) => ({ row: Math.floor(index / COLS), column: index % COLS });

  function neighbors(row, column) {
    const nearby = [];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if ((rowOffset || columnOffset) && inBounds(row + rowOffset, column + columnOffset)) {
          nearby.push([row + rowOffset, column + columnOffset]);
        }
      }
    }
    return nearby;
  }

  function cellLabel(index) {
    const { row, column } = position(index);
    const prefix = `Row ${row + 1}, column ${column + 1}`;
    if (flagged[index]) return `${prefix}, flagged`;
    if (!revealed[index]) return `${prefix}, hidden`;
    if (mine[index]) return `${prefix}, mine`;
    return counts[index] ? `${prefix}, ${counts[index]} adjacent mines` : `${prefix}, empty`;
  }

  function updateCell(index) {
    cells[index].setAttribute('aria-label', cellLabel(index));
  }

  function setActiveCell(index, { focus = true } = {}) {
    cells[activeIndex].tabIndex = -1;
    activeIndex = index;
    cells[activeIndex].tabIndex = 0;
    if (focus) cells[activeIndex].focus();
  }

  function build() {
    grid.replaceChildren();
    cells = [];
    mine = Array(TOTAL).fill(false);
    revealed = Array(TOTAL).fill(false);
    flagged = Array(TOTAL).fill(false);
    counts = Array(TOTAL).fill(0);
    started = false;
    over = false;
    revealedCount = 0;
    flags = 0;
    timer = 0;
    activeIndex = 0;
    clearInterval(timerId);
    timerId = null;
    minesLed.textContent = pad(MINES);
    timerLed.textContent = pad(0);
    face.textContent = '🙂';
    status.textContent = 'New game ready.';

    for (let row = 0; row < ROWS; row += 1) {
      const rowElement = document.createElement('div');
      rowElement.className = 'ms-row';
      rowElement.setAttribute('role', 'row');
      rowElement.setAttribute('aria-rowindex', String(row + 1));
      for (let column = 0; column < COLS; column += 1) {
        const i = indexOf(row, column);
        const button = document.createElement('button');
        button.className = 'ms-cell';
        button.type = 'button';
        button.dataset.i = i;
        button.tabIndex = i === 0 ? 0 : -1;
        button.setAttribute('role', 'gridcell');
        button.setAttribute('aria-rowindex', String(row + 1));
        button.setAttribute('aria-colindex', String(column + 1));
        cells[i] = button;
        updateCell(i);
        rowElement.append(button);
      }
      grid.append(rowElement);
    }
  }

  function placeMines(safeIndex) {
    let placed = 0;
    while (placed < MINES) {
      const index = Math.floor(Math.random() * TOTAL);
      if (index === safeIndex || mine[index]) continue;
      mine[index] = true;
      placed += 1;
    }
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        const index = indexOf(row, column);
        if (!mine[index]) {
          counts[index] = neighbors(row, column)
            .filter(([nearRow, nearColumn]) => mine[indexOf(nearRow, nearColumn)]).length;
        }
      }
    }
  }

  function reveal(index) {
    if (revealed[index] || flagged[index]) return;
    revealed[index] = true;
    revealedCount += 1;
    const button = cells[index];
    button.classList.add('revealed');
    if (counts[index]) {
      button.textContent = counts[index];
      button.classList.add(`n${counts[index]}`);
    } else {
      const { row, column } = position(index);
      neighbors(row, column).forEach(([nearRow, nearColumn]) => reveal(indexOf(nearRow, nearColumn)));
    }
    updateCell(index);
  }

  function lose(hitIndex) {
    over = true;
    clearInterval(timerId);
    for (let index = 0; index < TOTAL; index += 1) {
      if (mine[index]) {
        revealed[index] = true;
        cells[index].classList.add('revealed', 'mine');
        cells[index].textContent = '💣';
        cells[index].setAttribute('aria-label', `${cellLabel(index)}, mine`);
      } else if (flagged[index]) {
        cells[index].textContent = '❌';
        const { row, column } = position(index);
        cells[index].setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}, incorrectly flagged`);
        continue;
      }
      if (!mine[index]) updateCell(index);
    }
    cells[hitIndex].classList.add('exploded');
    face.textContent = '😵';
    const { row, column } = position(hitIndex);
    status.textContent = `Game over. Exploded mine at row ${row + 1}, column ${column + 1}.`;
  }

  function winGame() {
    over = true;
    clearInterval(timerId);
    face.textContent = '😎';
    for (let index = 0; index < TOTAL; index += 1) {
      if (mine[index] && !flagged[index]) {
        flagged[index] = true;
        cells[index].textContent = '🚩';
        updateCell(index);
      }
    }
    minesLed.textContent = pad(0);
    status.textContent = `Game won in ${timer} seconds.`;
  }

  function revealCell(index) {
    if (over || flagged[index] || revealed[index]) return;
    if (!started) {
      placeMines(index);
      started = true;
      timerId = setInterval(() => {
        timer = Math.min(999, timer + 1);
        timerLed.textContent = pad(timer);
      }, 1000);
    }
    if (mine[index]) {
      lose(index);
      return;
    }
    reveal(index);
    if (revealedCount === TOTAL - MINES) winGame();
  }

  function toggleFlag(index) {
    if (over || revealed[index]) return;
    flagged[index] = !flagged[index];
    cells[index].textContent = flagged[index] ? '🚩' : '';
    flags += flagged[index] ? 1 : -1;
    minesLed.textContent = pad(MINES - flags);
    updateCell(index);
  }

  grid.addEventListener('click', (event) => {
    if (longPressed) {
      longPressed = false;
      return;
    }
    const cell = event.target.closest('.ms-cell');
    if (cell) revealCell(Number(cell.dataset.i));
  });
  grid.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const cell = event.target.closest('.ms-cell');
    if (cell) toggleFlag(Number(cell.dataset.i));
  });
  grid.addEventListener('keydown', (event) => {
    const cell = event.target.closest('.ms-cell');
    if (!cell) return;
    const current = Number(cell.dataset.i);
    const { row, column } = position(current);
    let next = current;
    if (event.key === 'ArrowLeft' && column > 0) next -= 1;
    else if (event.key === 'ArrowRight' && column < COLS - 1) next += 1;
    else if (event.key === 'ArrowUp' && row > 0) next -= COLS;
    else if (event.key === 'ArrowDown' && row < ROWS - 1) next += COLS;
    else if (event.key === 'Home') next = indexOf(row, 0);
    else if (event.key === 'End') next = indexOf(row, COLS - 1);
    else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFlag(current);
      return;
    } else return;
    event.preventDefault();
    setActiveCell(next);
  });
  grid.addEventListener('focusin', (event) => {
    const cell = event.target.closest('.ms-cell');
    if (cell) setActiveCell(Number(cell.dataset.i), { focus: false });
  });
  grid.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    const cell = event.target.closest('.ms-cell');
    if (!cell) return;
    pressTimer = setTimeout(() => {
      longPressed = true;
      toggleFlag(Number(cell.dataset.i));
      navigator.vibrate?.(15);
    }, 350);
  });
  ['pointerup', 'pointercancel', 'pointermove'].forEach((eventName) => {
    grid.addEventListener(eventName, () => clearTimeout(pressTimer));
  });

  face.addEventListener('click', () => {
    build();
    cells[0].focus();
  });
  const openGame = () => openWindow(win);
  document.getElementById('msIconLink').addEventListener('click', openGame);
  document.getElementById('msMenuBtn').addEventListener('click', openGame);
  build();
}
