import {
  Board,
  Clue,
  Difficulty,
  ObjectType,
  Puzzle,
  Suspect,
  WindowSegment,
  coordKey,
  getRoomId,
  isBlockingObject,
  OCCUPIABLE_OBJECTS,
  BLOCKING_OBJECTS
} from "./types";
import { SeededRng } from "./rng";
import { computeVictimCell, getAdjacentCoords, getCellObject } from "./logic";
import { solvePuzzle } from "./solver";

type RoomRect = { id: number; x: number; y: number; w: number; h: number };

const clampSuspects = (gridSize: number, min: number, max: number) => {
  const cappedMax = Math.max(min, Math.min(max, gridSize - 1));
  const cappedMin = Math.min(min, cappedMax);
  return { min: cappedMin, max: cappedMax };
};

const difficultyParams = (difficulty: Difficulty, rng: SeededRng) => {
  if (difficulty === "easy") {
    const gridSize = rng.nextInt(4, 4);
    const suspectsRange = clampSuspects(gridSize, 3, 4);
    return {
      gridSize,
      suspects: rng.nextInt(suspectsRange.min, suspectsRange.max),
      rooms: rng.nextInt(2, 3),
      blocking: rng.nextInt(2, 6),
      occupiable: rng.nextInt(1, 2),
      windows: rng.nextInt(1, 2),
      cluesPerSuspect: 1
    };
  }
  if (difficulty === "medium") {
    const gridSize = rng.nextInt(4, 5);
    const suspectsRange = clampSuspects(gridSize, 4, 5);
    return {
      gridSize,
      suspects: rng.nextInt(suspectsRange.min, suspectsRange.max),
      rooms: rng.nextInt(3, 4),
      blocking: rng.nextInt(3, 7),
      occupiable: rng.nextInt(1, 3),
      windows: rng.nextInt(1, 3),
      cluesPerSuspect: rng.nextInt(1, 2)
    };
  }
  const gridSize = rng.nextInt(5, 6);
  const suspectsRange = clampSuspects(gridSize, 5, 6);
  return {
    gridSize,
    suspects: rng.nextInt(suspectsRange.min, suspectsRange.max),
    rooms: rng.nextInt(3, 6),
    blocking: rng.nextInt(4, 8),
    occupiable: rng.nextInt(2, 3),
    windows: rng.nextInt(2, 3),
    cluesPerSuspect: 2
  };
};

const splitRoom = (room: RoomRect, rng: SeededRng): RoomRect[] => {
  const possibleHorizontal: number[] = [];
  for (let split = 1; split < room.h; split += 1) {
    const areaA = split * room.w;
    const areaB = (room.h - split) * room.w;
    if (areaA >= 3 && areaB >= 3) {
      possibleHorizontal.push(split);
    }
  }
  const possibleVertical: number[] = [];
  for (let split = 1; split < room.w; split += 1) {
    const areaA = split * room.h;
    const areaB = (room.w - split) * room.h;
    if (areaA >= 3 && areaB >= 3) {
      possibleVertical.push(split);
    }
  }
  if (possibleHorizontal.length === 0 && possibleVertical.length === 0) {
    return [room];
  }
  const splitHoriz =
    possibleHorizontal.length > 0 &&
    (possibleVertical.length === 0 || rng.next() > 0.5);
  if (splitHoriz) {
    const split = rng.pick(possibleHorizontal);
    return [
      { ...room, h: split },
      { ...room, y: room.y + split, h: room.h - split }
    ];
  }
  const split = rng.pick(possibleVertical);
  return [
    { ...room, w: split },
    { ...room, x: room.x + split, w: room.w - split }
  ];
};

const generateRooms = (
  width: number,
  height: number,
  count: number,
  rng: SeededRng
) => {
  let rooms: RoomRect[] = [{ id: 0, x: 0, y: 0, w: width, h: height }];
  while (rooms.length < count) {
    const index = rng.nextInt(0, rooms.length - 1);
    const room = rooms[index];
    const splits = splitRoom(room, rng);
    if (splits.length === 1) {
      break;
    }
    rooms.splice(index, 1, splits[0], { ...splits[1], id: rooms.length });
  }

  const roomIds = Array.from({ length: height }, () => Array(width).fill(0));
  rooms.forEach((room) => {
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        roomIds[y][x] = room.id;
      }
    }
  });

  return { roomIds, rooms };
};

const listWindowSegments = (board: Board) => {
  const segments: WindowSegment[] = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const coord = { x, y };
      if (y === 0) {
        segments.push({ id: "", a: coord, dir: "N" });
      }
      if (y === board.height - 1) {
        segments.push({ id: "", a: coord, dir: "S" });
      }
      if (x === 0) {
        segments.push({ id: "", a: coord, dir: "W" });
      }
      if (x === board.width - 1) {
        segments.push({ id: "", a: coord, dir: "E" });
      }
      const right = { x: x + 1, y };
      if (x < board.width - 1) {
        if (getRoomId(board, coord) !== getRoomId(board, right)) {
          segments.push({ id: "", a: coord, b: right, dir: "E" });
        }
      }
      const down = { x, y: y + 1 };
      if (y < board.height - 1) {
        if (getRoomId(board, coord) !== getRoomId(board, down)) {
          segments.push({ id: "", a: coord, b: down, dir: "S" });
        }
      }
    }
  }
  return segments;
};

const placeObjects = (
  board: Board,
  rng: SeededRng,
  blockingCount: number,
  occupiableCount: number
) => {
  const objects: Record<string, ObjectType> = {};
  const coords = [] as { x: number; y: number }[];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      coords.push({ x, y });
    }
  }
  const shuffled = rng.shuffle(coords);
  let index = 0;
  for (let i = 0; i < blockingCount && index < shuffled.length; i += 1) {
    const coord = shuffled[index++];
    objects[coordKey(coord)] = rng.pick(BLOCKING_OBJECTS);
  }
  for (let i = 0; i < occupiableCount && index < shuffled.length; i += 1) {
    const coord = shuffled[index++];
    if (!objects[coordKey(coord)]) {
      objects[coordKey(coord)] = rng.pick(OCCUPIABLE_OBJECTS);
    }
  }
  return objects;
};

const pickSuspectPlacements = (
  board: Board,
  suspectCount: number,
  rng: SeededRng
) => {
  const rows = rng.shuffle(Array.from({ length: board.height }, (_, i) => i));
  const cols = rng.shuffle(Array.from({ length: board.width }, (_, i) => i));
  const placements: Record<string, { x: number; y: number }> = {};
  for (let i = 0; i < suspectCount; i += 1) {
    const row = rows[i];
    const col = cols[i];
    if (row === undefined || col === undefined) {
      return null;
    }
    const coord = { x: col, y: row };
    if (isBlockingObject(getCellObject(board, coord))) {
      return null;
    }
    placements[`S${i + 1}`] = coord;
  }
  return placements;
};

const clueText = (clue: Omit<Clue, "text">) => {
  const objectLabel = (objectType: ObjectType) => {
    const lower = objectType.toLowerCase();
    return objectType === "TV" ? "tv" : lower;
  };
  switch (clue.kind) {
    case "InRoom":
      return `Estava no ambiente ${clue.roomId + 1}`;
    case "OnObject":
      return `Estava em uma ${objectLabel(clue.objectType)}`;
    case "AdjacentToObject":
      return `Estava ao lado de uma ${objectLabel(clue.objectType)}`;
    case "NearObject":
      return `Estava junto de uma ${objectLabel(clue.objectType)}`;
    case "InFrontOfWindow":
      return `Estava na frente da janela ${clue.windowId}`;
    default:
      return "";
  }
};

const buildClue = (clue: Omit<Clue, "text">): Clue => ({
  ...clue,
  text: clueText(clue)
});

const possibleCluesFor = (
  board: Board,
  suspectCoord: { x: number; y: number }
) => {
  const clues: Omit<Clue, "text">[] = [];
  const roomId = getRoomId(board, suspectCoord);
  if (roomId !== undefined) {
    clues.push({ kind: "InRoom", roomId });
  }
  const objectType = getCellObject(board, suspectCoord);
  if (objectType) {
    clues.push({ kind: "OnObject", objectType });
  }
  const adjacentObjects = new Set<ObjectType>();
  getAdjacentCoords(board, suspectCoord).forEach((coord) => {
    const adj = getCellObject(board, coord);
    if (adj) {
      adjacentObjects.add(adj);
    }
  });
  adjacentObjects.forEach((objectType) => {
    clues.push({ kind: "AdjacentToObject", objectType });
    clues.push({ kind: "NearObject", objectType });
  });
  const roomObjects = new Set<ObjectType>();
  const roomIdTarget = getRoomId(board, suspectCoord);
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (getRoomId(board, { x, y }) === roomIdTarget) {
        const objectInRoom = getCellObject(board, { x, y });
        if (objectInRoom) {
          roomObjects.add(objectInRoom);
        }
      }
    }
  }
  roomObjects.forEach((objectType) => {
    clues.push({ kind: "NearObject", objectType });
  });
  board.windows.forEach((window) => {
    if (
      (window.a.x === suspectCoord.x && window.a.y === suspectCoord.y) ||
      (window.b &&
        window.b.x === suspectCoord.x &&
        window.b.y === suspectCoord.y)
    ) {
      clues.push({ kind: "InFrontOfWindow", windowId: window.id });
    }
  });
  return clues;
};

const buildSuspects = (
  placements: Record<string, { x: number; y: number }>,
  board: Board,
  clueCount: number,
  rng: SeededRng
) => {
  const suspects: Suspect[] = [];
  Object.entries(placements).forEach(([id, coord], index) => {
    const possible = possibleCluesFor(board, coord);
    const selected = rng
      .shuffle(possible)
      .slice(0, Math.min(clueCount, possible.length))
      .map(buildClue);
    suspects.push({
      id,
      name: `Suspeito ${index + 1}`,
      clues: selected
    });
  });
  return suspects;
};

const ensureUnique = (puzzle: Puzzle, rng: SeededRng) => {
  let attempts = 0;
  let result = solvePuzzle(puzzle, 2);
  while (result.solutions.length !== 1 && attempts < 6) {
    const suspect = rng.pick(puzzle.suspects);
    const placement = result.solutions[0]?.placements[suspect.id];
    if (!placement) {
      break;
    }
    const newClues = possibleCluesFor(puzzle.board, placement)
      .map(buildClue)
      .filter((clue) =>
        suspect.clues.every((existing) => existing.text !== clue.text)
      );
    if (newClues.length === 0) {
      break;
    }
    suspect.clues.push(rng.pick(newClues));
    result = solvePuzzle(puzzle, 2);
    attempts += 1;
  }
  return result.solutions.length === 1;
};

export const generatePuzzle = (
  seed: string,
  difficulty: Difficulty
): Puzzle => {
  const rng = new SeededRng(seed + difficulty);
  const params = difficultyParams(difficulty, rng);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const { roomIds } = generateRooms(
      params.gridSize,
      params.gridSize,
      params.rooms,
      rng
    );
    const board: Board = {
      width: params.gridSize,
      height: params.gridSize,
      roomIds,
      objects: {},
      windows: []
    };
    board.objects = placeObjects(
      board,
      rng,
      params.blocking,
      params.occupiable
    );

    const segments = rng.shuffle(listWindowSegments(board));
    board.windows = segments.slice(0, params.windows).map((segment, index) => ({
      ...segment,
      id: `${index + 1}`
    }));

    let placements = pickSuspectPlacements(board, params.suspects, rng);
    if (!placements) {
      continue;
    }
    const victim = computeVictimCell(board, placements);
    if (!victim) {
      placements = null;
    }
    if (!placements) {
      continue;
    }

    const suspects = buildSuspects(placements, board, params.cluesPerSuspect, rng);
    const puzzle: Puzzle = {
      seed,
      difficulty,
      board,
      suspects
    };

    const solved = solvePuzzle(puzzle, 2);
    if (solved.solutions.length === 1) {
      return puzzle;
    }

    if (ensureUnique(puzzle, rng)) {
      return puzzle;
    }
  }

  throw new Error("Falha ao gerar puzzle único.");
};
