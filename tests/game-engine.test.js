const { GameEngine, Tetromino } = require('../src/game-engine');

describe('GameEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  test('should initialize 20x10 grid', () => {
    const grid = engine.getGrid();
    expect(grid).toHaveLength(20);
    expect(grid[0]).toHaveLength(10);
    expect(grid[0].every(cell => cell === 0)).toBe(true);
  });

  test('should get game state', () => {
    const state = engine.getState();
    expect(state.grid).toHaveLength(20);
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
  });

  test('should spawn new piece', () => {
    const result = engine.spawnNewPiece();
    expect(result).toBe(true);
    expect(engine.currentPiece).toBeTruthy();
    expect(engine.nextPieces).toHaveLength(3);
  });

  test('should move piece left', () => {
    engine.spawnNewPiece();
    const initialX = engine.currentPiece.x;
    const moved = engine.movePiece('left');
    expect(moved).toBe(true);
    expect(engine.currentPiece.x).toBe(initialX - 1);
  });

  test('should detect collision at boundaries', () => {
    const piece = new Tetromino('I');
    const collision = engine.checkCollision(piece, -1, 0);
    expect(collision).toBe(true);
  });

  test('should clear completed lines', () => {
    // Fill bottom row
    for (let x = 0; x < 10; x++) {
      engine.grid[19][x] = 1;
    }
    const linesCleared = engine.clearLines();
    expect(linesCleared).toBe(1);
    expect(engine.grid[19].every(cell => cell === 0)).toBe(true);
  });

  test('should update score correctly', () => {
    const initialScore = engine.score;
    engine.updateScore(1);
    expect(engine.score).toBeGreaterThan(initialScore);
  });
});

describe('Tetromino', () => {
  test('should create I piece', () => {
    const piece = new Tetromino('I');
    expect(piece.type).toBe('I');
    expect(piece.rotation).toBe(0);
    expect(piece.getShape()).toBeDefined();
  });

  test('should rotate piece', () => {
    const piece = new Tetromino('T');
    const initialRotation = piece.rotation;
    piece.rotate();
    expect(piece.rotation).toBe((initialRotation + 1) % 4);
  });
});