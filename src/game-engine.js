// Core Tetris game engine with optimized collision detection
class GameEngine {
  constructor() {
    this.grid = this.createEmptyGrid();
    this.currentPiece = null;
    this.nextPieces = [];
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameState = 'playing';
    this.dropTimer = 0;
    this.dropInterval = 1000; // 1 second initially
  }

  createEmptyGrid() {
    return Array(20).fill().map(() => Array(10).fill(0));
  }

  spawnNewPiece() {
    if (this.nextPieces.length === 0) {
      this.generateNextPieces();
    }
    
    this.currentPiece = this.nextPieces.shift();
    this.currentPiece.x = 4;
    this.currentPiece.y = 0;
    
    if (this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y)) {
      this.gameState = 'gameOver';
      return false;
    }
    
    this.generateNextPieces();
    return true;
  }

  generateNextPieces() {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    while (this.nextPieces.length < 3) {
      const type = pieces[Math.floor(Math.random() * pieces.length)];
      this.nextPieces.push(new Tetromino(type));
    }
  }

  checkCollision(piece, x, y) {
    const shape = piece.getShape();
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        
        const newX = x + col;
        const newY = y + row;
        
        // Boundary checks
        if (newX < 0 || newX >= 10 || newY >= 20) return true;
        if (newY < 0) continue;
        
        // Grid collision
        if (this.grid[newY][newX] !== 0) return true;
      }
    }
    return false;
  }

  movePiece(direction) {
    if (!this.currentPiece || this.gameState !== 'playing') return false;
    
    let newX = this.currentPiece.x;
    let newY = this.currentPiece.y;
    
    switch (direction) {
      case 'left': newX--; break;
      case 'right': newX++; break;
      case 'down': newY++; break;
    }
    
    if (!this.checkCollision(this.currentPiece, newX, newY)) {
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      return true;
    }
    
    // If moving down failed, lock piece
    if (direction === 'down') {
      this.lockPiece();
    }
    
    return false;
  }

  rotatePiece() {
    if (!this.currentPiece || this.gameState !== 'playing') return false;
    
    const originalRotation = this.currentPiece.rotation;
    this.currentPiece.rotate();
    
    // Try wall kicks
    const kicks = this.getWallKicks(this.currentPiece.type, originalRotation);
    
    for (const kick of kicks) {
      const testX = this.currentPiece.x + kick.x;
      const testY = this.currentPiece.y + kick.y;
      
      if (!this.checkCollision(this.currentPiece, testX, testY)) {
        this.currentPiece.x = testX;
        this.currentPiece.y = testY;
        return true;
      }
    }
    
    // Rotation failed, revert
    this.currentPiece.rotation = originalRotation;
    return false;
  }

  getWallKicks(pieceType, fromRotation) {
    // Standard SRS wall kick data
    const kicks = {
      'JLSTZ': [
        [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
        [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }]
      ],
      'I': [
        [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
        [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
        [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }]
      ]
    };
    
    const kickType = pieceType === 'I' ? 'I' : 'JLSTZ';
    return kicks[kickType][fromRotation] || [{ x: 0, y: 0 }];
  }

  lockPiece() {
    const shape = this.currentPiece.getShape();
    
    // Place piece on grid
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const x = this.currentPiece.x + col;
          const y = this.currentPiece.y + row;
          if (y >= 0) {
            this.grid[y][x] = this.currentPiece.type;
          }
        }
      }
    }
    
    // Clear lines and update score
    const linesCleared = this.clearLines();
    this.updateScore(linesCleared);
    
    // Spawn next piece
    this.spawnNewPiece();
  }

  clearLines() {
    let linesCleared = 0;
    let writeIndex = 19;
    
    // Scan from bottom to top
    for (let readIndex = 19; readIndex >= 0; readIndex--) {
      if (!this.isLineFull(readIndex)) {
        if (writeIndex !== readIndex) {
          this.grid[writeIndex] = [...this.grid[readIndex]];
        }
        writeIndex--;
      } else {
        linesCleared++;
      }
    }
    
    // Fill top with empty lines
    for (let i = 0; i <= writeIndex; i++) {
      this.grid[i] = new Array(10).fill(0);
    }
    
    return linesCleared;
  }

  isLineFull(row) {
    return this.grid[row].every(cell => cell !== 0);
  }

  updateScore(linesCleared) {
    if (linesCleared > 0) {
      const points = [0, 40, 100, 300, 1200][linesCleared] * this.level;
      this.score += points;
      this.lines += linesCleared;
      
      // Level up every 10 lines
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50);
      }
    }
  }

  update(deltaTime) {
    if (this.gameState !== 'playing') return;
    
    this.dropTimer += deltaTime;
    if (this.dropTimer >= this.dropInterval) {
      this.movePiece('down');
      this.dropTimer = 0;
    }
  }

  getGrid() {
    return this.grid.map(row => [...row]);
  }

  getState() {
    return {
      grid: this.grid.map(row => [...row]),
      currentPiece: this.currentPiece ? {
        type: this.currentPiece.type,
        x: this.currentPiece.x,
        y: this.currentPiece.y,
        rotation: this.currentPiece.rotation,
        shape: this.currentPiece.getShape()
      } : null,
      nextPieces: this.nextPieces.map(p => ({ type: p.type, shape: p.getShape() })),
      score: this.score,
      level: this.level,
      lines: this.lines,
      gameState: this.gameState
    };
  }
}

class Tetromino {
  constructor(type) {
    this.type = type;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.shapes = this.getShapes();
  }

  getShapes() {
    const shapes = {
      'I': [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
        [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
      ],
      'O': [
        [[1,1],[1,1]],
        [[1,1],[1,1]],
        [[1,1],[1,1]],
        [[1,1],[1,1]]
      ],
      'T': [
        [[0,1,0],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,1],[0,1,0]],
        [[0,1,0],[1,1,0],[0,1,0]]
      ],
      'S': [
        [[0,1,1],[1,1,0],[0,0,0]],
        [[0,1,0],[0,1,1],[0,0,1]],
        [[0,0,0],[0,1,1],[1,1,0]],
        [[1,0,0],[1,1,0],[0,1,0]]
      ],
      'Z': [
        [[1,1,0],[0,1,1],[0,0,0]],
        [[0,0,1],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,0],[0,1,1]],
        [[0,1,0],[1,1,0],[1,0,0]]
      ],
      'J': [
        [[1,0,0],[1,1,1],[0,0,0]],
        [[0,1,1],[0,1,0],[0,1,0]],
        [[0,0,0],[1,1,1],[0,0,1]],
        [[0,1,0],[0,1,0],[1,1,0]]
      ],
      'L': [
        [[0,0,1],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,0],[0,1,1]],
        [[0,0,0],[1,1,1],[1,0,0]],
        [[1,1,0],[0,1,0],[0,1,0]]
      ]
    };
    return shapes[this.type];
  }

  getShape() {
    return this.shapes[this.rotation];
  }

  rotate() {
    this.rotation = (this.rotation + 1) % 4;
  }
}

export { GameEngine, Tetromino };