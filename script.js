const nickname = localStorage.getItem("nickname");
  
const greetMessage = `Hello, ${nickname}!`;
document.getElementById("nicknameDisplay").innerText = greetMessage;

const SHUFFLE = "SHUFFLE";
const AUTOMOVETILE = "AUTOMOVETILE";
const CHANGEDIMENSIONS = "CHANGEDIMENSIONS";
const gameOverAudio = new Audio("http://bit.ly/so-crowd-cheer");


const getRowAndCol = (index, dimensions) => {
  let row = Math.floor(index / dimensions[1]);
  let col = index - row * dimensions[0];
  return [row, col];
};

const checkWinningConditions = (elements) => {
  let firstelements = elements.slice(0, elements.length - 1);
  return !firstelements.some((element, i) => element.id !== `${i + 1}`);
};

const autoMoveTile = ({ dimensions, elements }, tileid) => {
  let cloned = elements.slice();
  let curidx = cloned.findIndex((d) => d.id === tileid);
  let [currow, curcol] = getRowAndCol(curidx, dimensions);
  let nullidx = cloned.findIndex((d) => d.id === null);
  let [nullrow, nullcol] = getRowAndCol(nullidx, dimensions);
  let swap = false;
  if (currow === nullrow) {
    if (curcol + 1 === nullcol || curcol - 1 === nullcol) {
      swap = true;
    }
  } else if (curcol === nullcol) {
    if (currow + 1 === nullrow || currow - 1 === nullrow) {
      swap = true;
    }
  }

  if (swap) {
    let temp = cloned[curidx];
    cloned[curidx] = cloned[nullidx];
    cloned[nullidx] = temp;
    return cloned;
  }
  return null;
};

const generateElements = (dimensions) => {
  let elements = Array.from({ length: dimensions[0] * dimensions[1] }).map(
    (_, i, arr) => {
      return {
        id: i < arr.length - 1 ? `${i + 1}` : null,
      };
    }
  );
  let lastelement = null;
  for (let i = 0; i < (dimensions[0] * dimensions[1]) ** 2; i++) {
    let nullidx = elements.findIndex((d) => d.id === null);
    let [nullrow, nullcol] = getRowAndCol(nullidx, dimensions);
    let candidates = [
      [nullrow - 1, nullcol],
      [nullrow + 1, nullcol],
      [nullrow, nullcol - 1],
      [nullrow, nullcol + 1],
    ]
      .filter(
        (d) =>
          d[0] >= 0 &&
          d[0] < dimensions[0] &&
          d[1] >= 0 &&
          d[1] < dimensions[1]
      )
      .map((d) => elements[d[0] * dimensions[1] + d[1]])
      .filter((el) => el !== lastelement);

    let winner =
      candidates[Math.floor(Math.random() * candidates.length)];
    let winneridx = elements.indexOf(winner);
    elements[winneridx] = elements[nullidx];
    elements[nullidx] = winner;
    lastelement = winner;
  }
  return elements;
};

const defaultDimensions = [5, 5];
const defaultState = {
  dimensions: defaultDimensions,
  elements: generateElements(defaultDimensions),
  moveCounter: 0,
};

function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SHUFFLE:
      return {
        ...state,
        elements: generateElements(state.dimensions),
        moveCounter: 0,
      };
    case AUTOMOVETILE:
      let newels = autoMoveTile(state, action.tileid);
      if (newels !== null) {
        return {
          ...state,
          elements: newels,
          moveCounter: state.moveCounter + 1,
        };
      } else {
        return state;
      }
    case CHANGEDIMENSIONS:
      return {
        ...state,
        dimensions: action.dimensions,
        elements: generateElements(action.dimensions),
        moveCounter: 0,
      };
    default:
      return state;
  }
}

const store = {
  _listeners: [],
  state: defaultState,
  registerListener(callback) {
    this._listeners.push(callback);
  },
  unregisterListener(callback) {
    this._listeners = this._listeners.filter(
      (listener) !== callback
    );
  },
  dispatch(action) {
    this.state = reducer(this.state, action);
    this._listeners.forEach((listener) =>
      listener.call(null, this.state)
    );
  },
};

function generateTiles(dimensions, elements) {
  return elements
    .filter((element) => element.id !== null)
    .map((element) => {
      let newel = document.createElement("div");
      newel.dataset.tileid = element.id;
      newel.classList.add("tile");
      let innerel = document.createElement("div");
      innerel.classList.add("tile-inner");
      let textel = document.createElement("div");
      textel.innerText = element.id;
      innerel.appendChild(textel);
      newel.appendChild(innerel);
      newel.onclick = () => {
        store.dispatch({
          type: AUTOMOVETILE,
          tileid: element.id,
        });
      };
      return newel;
    });
}

function createBoard(dimensions) {
  let retel = document.createElement("div");
  retel.classList.add("board");
  retel.style.display = "grid";
  retel.style.gridTemplateColumns = `repeat(${dimensions[1]}, 1fr)`;
  retel.style.gridTemplateRows = `repeat(${dimensions[0]}, 1fr)`;
  return retel;
}

function createForm(value) {
  let retel = document.createElement("div");
  retel.classList.add("controls");

  let label = document.createElement("div");
  label.innerText = "Board size: ";
  label.classList.add("spinner-label");

  let downButton = document.createElement("button");
  downButton.innerText = "-";
  downButton.onclick = (evt) => {
    if (value > 3) {
      store.dispatch({
        type: CHANGEDIMENSIONS,
        dimensions: [value - 1, value - 1],
      });
    }
  };
  downButton.classList.add("down-button");

  let valueDisplay = document.createElement("div");
  valueDisplay.innerText = `${store.state.dimensions[0]}`;
  valueDisplay.classList.add("value-display");

  let upButton = document.createElement("button");
  upButton.innerText = "+";
  upButton.onclick = (evt) => {
    if (value < 10) {
      store.dispatch({
        type: CHANGEDIMENSIONS,
        dimensions: [value + 1, value + 1],
      });
    }
  };
  upButton.classList.add("up-button");

  let shuffleButton = document.createElement("button");
  shuffleButton.innerText = "Shuffle";
  shuffleButton.onclick = (evt) => {
    store.dispatch({
      type: SHUFFLE,
    });
  };
  shuffleButton.classList.add("shuffle-button");

  retel.appendChild(label);
  retel.appendChild(downButton);
  retel.appendChild(valueDisplay);
  retel.appendChild(upButton);
  retel.appendChild(shuffleButton);
  return retel;
}

const getPopupInner = ({ moves = 0, best = false, bestMoves = 0 }) => {
  let inner = document.createElement("div");
  inner.innerHTML = `<div class="title">You won!!!</div><div class="moves">Moves: ${moves}</div>${
    best
      ? `<div class="best">🏆A personal best! 🏆</div>`
      : `<div class="record">Your record: ${bestMoves}</div>`
  }`;
  let resetButton = document.createElement("button");
  resetButton.classList.add("reset-button");
  resetButton.innerText = "New game";
  resetButton.onclick = () => {
    store.dispatch({
      type: SHUFFLE,
    });
  };
  inner.appendChild(resetButton);
  return inner;
};

let htmlElements;
let frame;
let controls;
let board;
let lastDimensions;
let winningel;
let popup;
let status;
let backgroundMusic;
function render(root, state, first = false) {
  if (
    first ||
    lastDimensions[0] !== state.dimensions[0] ||
    lastDimensions[1] !== state.dimensions[1]
  ) {
    frame = document.createElement("div");
    frame.classList.add("frame");
    controls = createForm(state.dimensions[0]);
    board = createBoard(state.dimensions);
    lastDimensions = state.dimensions;
    htmlElements = generateTiles(state.dimensions, state.elements);
    popup = document.createElement("div");
    popup.classList.add("popup");

    status = document.createElement("div");
    status.classList.add("status");
    root.innerHTML = "";
    htmlElements.forEach((htmlel) => board.appendChild(htmlel));

    frame.appendChild(board);
    frame.appendChild(status);
    frame.appendChild(controls);
    root.appendChild(frame);
    root.appendChild(popup);
  }
  if (htmlElements) {
    state.elements.forEach((el, i) => {
      if (el.id === null) {
        return;
      }
      let curel = htmlElements.find(
        (htmlel) => htmlel.dataset.tileid === el.id
      );
      let [row, col] = getRowAndCol(i, state.dimensions);
      curel.style.gridRow = `${row + 1}`;
      curel.style.gridColumn = `${col + 1}`;
    });
    status.innerText = `Moves: ${state.moveCounter}`;
    if (checkWinningConditions(state.elements)) {
      let bestmoves = localStorage.getItem(
        "bestMoves_" + state.dimensions.join("x")
      );

      if (bestmoves === null || state.moveCounter < bestmoves) {
        popup.innerHTML = "";
        popup.appendChild(
          getPopupInner({ moves: state.moveCounter, best: true })
        );
        localStorage.setItem(
          "bestMoves_" + state.dimensions.join("x"),
          state.moveCounter
        );
      } else {
        popup.innerHTML = "";
        popup.appendChild(
          getPopupInner({
            moves: state.moveCounter,
            best: false,
            bestMoves: bestmoves,
          })
        );
      }
      popup.classList.add("winning");
      gameOverAudio.play(); 
    } else {
      popup.classList.remove("winning");
    }
  }
}

  if (backgroundMusic && !backgroundMusic.paused && !first) {
    backgroundMusic.pause(); 
  }


let approot = document.querySelector("#root");

backgroundMusic = new Audio("assets/DRIVE(chosic.com).mp3"); 

document.addEventListener("click", () => {
  if (!backgroundMusic.paused) {
    return; 
  }
  backgroundMusic.play();
});

render(approot, store.state, true);
store.registerListener((state) => render(approot, state));