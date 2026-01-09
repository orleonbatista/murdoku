import { describe, expect, it } from "vitest";
import {
  Board,
  Clue,
  Difficulty,
  candidateCellsForClue,
  computeVictimCell,
  generatePuzzle,
  solvePuzzle
} from "../engine";

const makeBoard = (): Board => ({
  width: 2,
  height: 2,
  roomIds: [
    [0, 0],
    [0, 1]
  ],
  objects: {
    "0,0": "Planta",
    "1,1": "Mesa"
  },
  windows: [
    { id: "borda", a: { x: 0, y: 0 }, dir: "N" },
    { id: "interna", a: { x: 0, y: 1 }, b: { x: 1, y: 1 }, dir: "E" }
  ]
});

describe("clue rules", () => {
  it("considera junto de objeto como adjacente ou mesmo ambiente", () => {
    const board = makeBoard();
    const clue: Clue = {
      kind: "NearObject",
      objectType: "Planta",
      text: ""
    };
    const candidates = candidateCellsForClue(board, clue);
    const coords = candidates.map((coord) => `${coord.x},${coord.y}`);
    expect(coords).toContain("0,1");
    expect(coords).toContain("1,0");
  });

  it("considera janela na borda e interna", () => {
    const board = makeBoard();
    const borderClue: Clue = {
      kind: "InFrontOfWindow",
      windowId: "borda",
      text: ""
    };
    const internalClue: Clue = {
      kind: "InFrontOfWindow",
      windowId: "interna",
      text: ""
    };
    const borderCells = candidateCellsForClue(board, borderClue).map(
      (coord) => `${coord.x},${coord.y}`
    );
    const internalCells = candidateCellsForClue(board, internalClue).map(
      (coord) => `${coord.x},${coord.y}`
    );
    expect(borderCells).toEqual(["0,0"]);
    expect(internalCells).toEqual(["0,1", "1,1"]);
  });
});

describe("generator", () => {
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  it("gera puzzles com solução única", () => {
    difficulties.forEach((difficulty) => {
      for (let i = 0; i < 200; i += 1) {
        const puzzle = generatePuzzle(`seed-${difficulty}-${i}`, difficulty);
        const result = solvePuzzle(puzzle, 2);
        expect(result.solutions.length).toBe(1);
      }
    });
  });

  it("sempre deixa exatamente uma célula válida para a vítima", () => {
    const puzzle = generatePuzzle("victim-check", "easy");
    const solved = solvePuzzle(puzzle, 1);
    expect(solved.solutions.length).toBe(1);
    const placement = solved.solutions[0].placements;
    const victim = computeVictimCell(puzzle.board, placement);
    expect(victim).not.toBeNull();
  });
});
