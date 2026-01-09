import {
  Board,
  Clue,
  Coord,
  PlacementMap,
  Solution,
  WindowSegment,
  allCoords,
  coordKey,
  getRoomId,
  isBlockingObject
} from "./types";

export const getCellObject = (board: Board, coord: Coord) =>
  board.objects[coordKey(coord)];

export const isCellBlocked = (board: Board, coord: Coord) =>
  isBlockingObject(getCellObject(board, coord));

export const getAdjacentCoords = (board: Board, coord: Coord) => {
  const candidates = [
    { x: coord.x - 1, y: coord.y },
    { x: coord.x + 1, y: coord.y },
    { x: coord.x, y: coord.y - 1 },
    { x: coord.x, y: coord.y + 1 }
  ];
  return candidates.filter(
    (candidate) =>
      candidate.x >= 0 &&
      candidate.y >= 0 &&
      candidate.x < board.width &&
      candidate.y < board.height
  );
};

export const windowTouchesCell = (window: WindowSegment, coord: Coord) =>
  (window.a.x === coord.x && window.a.y === coord.y) ||
  (!!window.b && window.b.x === coord.x && window.b.y === coord.y);

export const cellsAdjacentToObject = (
  board: Board,
  objectType: string
): Coord[] => {
  const coords = allCoords(board);
  const matches = new Set<string>();
  coords.forEach((coord) => {
    if (getCellObject(board, coord) === objectType) {
      getAdjacentCoords(board, coord).forEach((adjacent) => {
        matches.add(coordKey(adjacent));
      });
    }
  });
  return Array.from(matches).map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
};

export const cellsInRoom = (board: Board, roomId: number) =>
  allCoords(board).filter((coord) => getRoomId(board, coord) === roomId);

export const cellsNearObject = (board: Board, objectType: string) => {
  const adjacent = cellsAdjacentToObject(board, objectType);
  const roomsWithObject = new Set<number>();
  allCoords(board).forEach((coord) => {
    if (getCellObject(board, coord) === objectType) {
      const roomId = getRoomId(board, coord);
      if (roomId !== undefined) {
        roomsWithObject.add(roomId);
      }
    }
  });
  const sameRoom = allCoords(board).filter((coord) => {
    const roomId = getRoomId(board, coord);
    return roomId !== undefined && roomsWithObject.has(roomId);
  });
  const all = new Map<string, Coord>();
  [...adjacent, ...sameRoom].forEach((coord) => {
    all.set(coordKey(coord), coord);
  });
  return Array.from(all.values());
};

export const candidateCellsForClue = (board: Board, clue: Clue) => {
  switch (clue.kind) {
    case "InRoom":
      return cellsInRoom(board, clue.roomId);
    case "OnObject":
      return allCoords(board).filter(
        (coord) => getCellObject(board, coord) === clue.objectType
      );
    case "AdjacentToObject":
      return cellsAdjacentToObject(board, clue.objectType);
    case "NearObject":
      return cellsNearObject(board, clue.objectType);
    case "InFrontOfWindow":
      return board.windows
        .filter((window) => window.id === clue.windowId)
        .flatMap((window) => [window.a, window.b].filter(Boolean) as Coord[]);
    default:
      return [];
  }
};

export const computeVictimCell = (
  board: Board,
  placements: PlacementMap
): Coord | null => {
  const occupied = new Set(Object.values(placements).map(coordKey));
  const rows = new Set<number>();
  const cols = new Set<number>();
  Object.values(placements).forEach((coord) => {
    rows.add(coord.y);
    cols.add(coord.x);
  });
  const remaining = allCoords(board).filter((coord) => {
    if (occupied.has(coordKey(coord))) {
      return false;
    }
    if (rows.has(coord.y) || cols.has(coord.x)) {
      return false;
    }
    return !isCellBlocked(board, coord);
  });
  if (remaining.length !== 1) {
    return null;
  }
  return remaining[0];
};

export const computeAssassinId = (
  board: Board,
  placements: PlacementMap,
  victim: Coord
) => {
  const victimRoom = getRoomId(board, victim);
  const match = Object.entries(placements).find(([, coord]) => {
    const roomId = getRoomId(board, coord);
    return roomId !== undefined && roomId === victimRoom;
  });
  return match?.[0] ?? "";
};

export const isPlacementValid = (
  board: Board,
  placements: PlacementMap
) => {
  const rowSet = new Set<number>();
  const colSet = new Set<number>();
  for (const coord of Object.values(placements)) {
    if (isCellBlocked(board, coord)) {
      return false;
    }
    if (rowSet.has(coord.y) || colSet.has(coord.x)) {
      return false;
    }
    rowSet.add(coord.y);
    colSet.add(coord.x);
  }
  return true;
};

export const getSolutionFromPlacements = (
  board: Board,
  placements: PlacementMap
): Solution | null => {
  const victim = computeVictimCell(board, placements);
  if (!victim) {
    return null;
  }
  const assassinId = computeAssassinId(board, placements, victim);
  if (!assassinId) {
    return null;
  }
  return { placements, victim, assassinId };
};
