export type Coord = { x: number; y: number };

export type ObjectType =
  | "Poltrona"
  | "Tapete"
  | "Cama"
  | "Mesa"
  | "TV"
  | "Planta"
  | "Estante"
  | "Caixa";

export const OCCUPIABLE_OBJECTS: ObjectType[] = ["Poltrona", "Tapete", "Cama"];
export const BLOCKING_OBJECTS: ObjectType[] = [
  "Mesa",
  "TV",
  "Planta",
  "Estante",
  "Caixa"
];

export type WindowSegment = {
  id: string;
  a: Coord;
  b?: Coord;
  dir?: "N" | "S" | "E" | "W";
};

export type Board = {
  width: number;
  height: number;
  roomIds: number[][];
  objects: Record<string, ObjectType>;
  windows: WindowSegment[];
};

export type Suspect = {
  id: string;
  name: string;
  clues: Clue[];
};

export type Puzzle = {
  seed: string;
  difficulty: Difficulty;
  board: Board;
  suspects: Suspect[];
};

export type Difficulty = "easy" | "medium" | "hard";

export type Clue =
  | { kind: "InRoom"; roomId: number; text: string }
  | { kind: "OnObject"; objectType: ObjectType; text: string }
  | { kind: "AdjacentToObject"; objectType: ObjectType; text: string }
  | { kind: "NearObject"; objectType: ObjectType; text: string }
  | { kind: "InFrontOfWindow"; windowId: string; text: string };

export type PlacementMap = Record<string, Coord>;

export type Solution = {
  placements: PlacementMap;
  victim: Coord;
  assassinId: string;
};

export type SolverResult = {
  solutions: Solution[];
  explanation?: string;
};

export const coordKey = (coord: Coord) => `${coord.x},${coord.y}`;

export const parseCoordKey = (key: string): Coord => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
};

export const isInside = (board: Board, coord: Coord) =>
  coord.x >= 0 &&
  coord.y >= 0 &&
  coord.x < board.width &&
  coord.y < board.height;

export const getRoomId = (board: Board, coord: Coord) =>
  board.roomIds[coord.y]?.[coord.x];

export const allCoords = (board: Board): Coord[] => {
  const coords: Coord[] = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      coords.push({ x, y });
    }
  }
  return coords;
};

export const isBlockingObject = (objectType?: ObjectType) =>
  !!objectType && BLOCKING_OBJECTS.includes(objectType);

export const isOccupiableObject = (objectType?: ObjectType) =>
  !objectType || OCCUPIABLE_OBJECTS.includes(objectType);
