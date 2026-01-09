import {
  Board,
  PlacementMap,
  Puzzle,
  Solution,
  SolverResult,
  coordKey
} from "./types";
import {
  candidateCellsForClue,
  computeVictimCell,
  getSolutionFromPlacements,
  isCellBlocked,
  isPlacementValid
} from "./logic";

const intersect = (a: Set<string>, b: Set<string>) => {
  const result = new Set<string>();
  a.forEach((value) => {
    if (b.has(value)) {
      result.add(value);
    }
  });
  return result;
};

const buildDomains = (board: Board, puzzle: Puzzle) => {
  const domains: Record<string, Set<string>> = {};
  const allCells = new Set<string>();
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (!isCellBlocked(board, { x, y })) {
        allCells.add(coordKey({ x, y }));
      }
    }
  }

  puzzle.suspects.forEach((suspect) => {
    let domain = new Set(allCells);
    suspect.clues.forEach((clue) => {
      const candidates = candidateCellsForClue(board, clue).map(coordKey);
      domain = intersect(domain, new Set(candidates));
    });
    domains[suspect.id] = domain;
  });

  return domains;
};

const propagate = (domains: Record<string, Set<string>>) => {
  const placements: PlacementMap = {};
  const rows = new Set<number>();
  const cols = new Set<number>();
  let changed = true;

  while (changed) {
    changed = false;
    Object.entries(domains).forEach(([id, domain]) => {
      if (domain.size === 1 && !placements[id]) {
        const [cell] = domain;
        const [x, y] = cell.split(",").map(Number);
        placements[id] = { x, y };
        rows.add(y);
        cols.add(x);
        changed = true;
      }
    });

    if (changed) {
      Object.entries(domains).forEach(([id, domain]) => {
        if (placements[id]) {
          return;
        }
        const filtered = new Set<string>();
        domain.forEach((cell) => {
          const [x, y] = cell.split(",").map(Number);
          if (!rows.has(y) && !cols.has(x)) {
            filtered.add(cell);
          }
        });
        domains[id] = filtered;
      });
    }
  }

  return { placements, domains, rows, cols };
};

const selectUnassigned = (domains: Record<string, Set<string>>) => {
  let minId: string | null = null;
  let minSize = Number.POSITIVE_INFINITY;
  Object.entries(domains).forEach(([id, domain]) => {
    if (domain.size === 0) {
      minId = id;
      minSize = 0;
      return;
    }
    if (domain.size > 1 && domain.size < minSize) {
      minSize = domain.size;
      minId = id;
    }
  });
  return minId;
};

const backtrack = (
  board: Board,
  domains: Record<string, Set<string>>,
  placements: PlacementMap,
  rows: Set<number>,
  cols: Set<number>,
  solutions: Solution[],
  maxSolutions: number
) => {
  if (solutions.length >= maxSolutions) {
    return;
  }

  if (Object.keys(placements).length === Object.keys(domains).length) {
    const solution = getSolutionFromPlacements(board, placements);
    if (solution) {
      solutions.push(solution);
    }
    return;
  }

  const nextId = selectUnassigned(domains);
  if (!nextId) {
    return;
  }

  const domain = domains[nextId];
  if (domain.size === 0) {
    return;
  }

  const options = Array.from(domain);
  for (const cell of options) {
    const [x, y] = cell.split(",").map(Number);
    if (rows.has(y) || cols.has(x)) {
      continue;
    }

    const newPlacements = { ...placements, [nextId]: { x, y } };
    if (!isPlacementValid(board, newPlacements)) {
      continue;
    }

    const newDomains: Record<string, Set<string>> = {};
    Object.entries(domains).forEach(([id, set]) => {
      if (id === nextId) {
        newDomains[id] = new Set([cell]);
        return;
      }
      const filtered = new Set<string>();
      set.forEach((candidate) => {
        const [cx, cy] = candidate.split(",").map(Number);
        if (cy !== y && cx !== x) {
          filtered.add(candidate);
        }
      });
      newDomains[id] = filtered;
    });

    const nextRows = new Set(rows);
    const nextCols = new Set(cols);
    nextRows.add(y);
    nextCols.add(x);

    backtrack(board, newDomains, newPlacements, nextRows, nextCols, solutions, maxSolutions);
    if (solutions.length >= maxSolutions) {
      return;
    }
  }
};

export const solvePuzzle = (
  puzzle: Puzzle,
  maxSolutions = 2
): SolverResult => {
  const domains = buildDomains(puzzle.board, puzzle);
  const { placements, domains: propagated, rows, cols } = propagate(domains);
  const solutions: Solution[] = [];

  if (!isPlacementValid(puzzle.board, placements)) {
    return { solutions: [] };
  }

  backtrack(puzzle.board, propagated, placements, rows, cols, solutions, maxSolutions);

  let explanation: string | undefined;
  if (solutions.length > 0) {
    const unique = solutions[0];
    const unplaced = puzzle.suspects.find(
      (suspect) => !placements[suspect.id]
    );
    if (unplaced) {
      const coord = unique.placements[unplaced.id];
      explanation = `${unplaced.name} só pode estar em (${coord.x + 1},${
        coord.y + 1
      }) pelas pistas atuais.`;
    } else if (computeVictimCell(puzzle.board, placements)) {
      explanation = "A vítima é o último quadrado disponível após posicionar os suspeitos.";
    }
  }

  return { solutions, explanation };
};
