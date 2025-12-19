// High-performance Canvas renderer with Win95 theme
class Renderer {
  constructor(canvas, theme = 'win95') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.blockSize = 30;
    this.gridWidth = 10;
    this.gridHeight = 20;
    this.animationQueue = [];
    
    this.setupCanvas();
    this.loadThemes();
  }

  setupCanvas() {
    this.canvas.width = this.gridWidth * this.blockSize;
    this.canvas.height = this.gridHeight * this.blockSize;
    this.ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
  }

  loadThemes() {
    this.themes = {
      win95: {
        background: '#c0c0c0',
        gridBorder: '#808080',
        gridBackground: '#000000',
        blockColors: {
          'I': '#00ffff',
          'O': '#ffff00',
          'T': '#800080',
          'S': '#00ff00',
          'Z': '#ff0000',
          'J': '#0000ff',
          'L': '#ffa500'
        },
        blockBorder: '#ffffff',
        blockShadow: '#404040',
        text: '#000000',
        panel: '#c0c0c0',
        panelBorder: '#808080'
      },
      dark: {
        background: '#2d2d30',
        gridBorder: '#3e3e42',
        gridBackground: '#1e1e1e',
        blockColors: {
          'I': '#00d4ff',
          'O': '#ffd700',
          'T': '#9d4edd',
          'S': '#06ffa5',
          'Z': '#ff006e',
          'J': '#3a86ff',
          'L': '#ff8500'
        },
        blockBorder: '#ffffff',
        blockShadow: '#000000',
        text: '#ffffff',
        panel: '#2d2d30',
        panelBorder: '#3e3e42'
      }
    };
  }

  setTheme(theme) {
    this.theme = theme;
    this.render(); // Re-render with new theme
  }

  render(gameState) {
    this.clearCanvas();
    
    if (!gameState) return;
    
    this.renderGrid(gameState.grid);
    
    if (gameState.currentPiece) {
      this.renderPiece(gameState.currentPiece);
      this.renderGhost(gameState.currentPiece, gameState.grid);
    }
    
    this.processAnimations();
  }

  clearCanvas() {
    const colors = this.themes[this.theme];
    this.ctx.fillStyle = colors.gridBackground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderGrid(grid) {
    const colors = this.themes[this.theme];
    
    // Render placed blocks
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== 0) {
          this.renderBlock(x, y, grid[y][x]);
        }
      }
    }
    
    // Render grid lines
    this.ctx.strokeStyle = colors.gridBorder;
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.blockSize, 0);
      this.ctx.lineTo(x * this.blockSize, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.blockSize);
      this.ctx.lineTo(this.canvas.width, y * this.blockSize);
      this.ctx.stroke();
    }
  }

  renderPiece(piece) {
    if (!piece || !piece.shape) return;
    
    const shape = piece.shape;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          this.renderBlock(piece.x + x, piece.y + y, piece.type);
        }
      }
    }
  }

  renderGhost(piece, grid) {
    // Calculate ghost position
    let ghostY = piece.y;
    while (!this.wouldCollide(piece, piece.x, ghostY + 1, grid)) {
      ghostY++;
    }
    
    if (ghostY === piece.y) return; // No ghost needed
    
    const shape = piece.shape;
    const colors = this.themes[this.theme];
    
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          this.renderBlock(piece.x + x, ghostY + y, piece.type);
        }
      }
    }
    
    this.ctx.restore();
  }

  renderBlock(x, y, type) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;
    
    const colors = this.themes[this.theme];
    const blockColor = colors.blockColors[type] || colors.blockColors['I'];
    
    const pixelX = x * this.blockSize;
    const pixelY = y * this.blockSize;
    
    // Main block
    this.ctx.fillStyle = blockColor;
    this.ctx.fillRect(pixelX, pixelY, this.blockSize, this.blockSize);
    
    // Win95-style 3D border
    if (this.theme === 'win95') {
      // Highlight (top-left)
      this.ctx.strokeStyle = colors.blockBorder;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(pixelX, pixelY + this.blockSize);
      this.ctx.lineTo(pixelX, pixelY);
      this.ctx.lineTo(pixelX + this.blockSize, pixelY);
      this.ctx.stroke();
      
      // Shadow (bottom-right)
      this.ctx.strokeStyle = colors.blockShadow;
      this.ctx.beginPath();
      this.ctx.moveTo(pixelX + this.blockSize, pixelY);
      this.ctx.lineTo(pixelX + this.blockSize, pixelY + this.blockSize);
      this.ctx.lineTo(pixelX, pixelY + this.blockSize);
      this.ctx.stroke();
    } else {
      // Simple border for dark theme
      this.ctx.strokeStyle = colors.blockBorder;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(pixelX, pixelY, this.blockSize, this.blockSize);
    }
  }

  wouldCollide(piece, x, y, grid) {
    const shape = piece.shape;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        
        const newX = x + col;
        const newY = y + row;
        
        if (newX < 0 || newX >= this.gridWidth || newY >= this.gridHeight) return true;
        if (newY < 0) continue;
        if (grid[newY][newX] !== 0) return true;
      }
    }
    return false;
  }

  animateLineClear(lines) {
    lines.forEach(lineY => {
      this.animationQueue.push({
        type: 'lineClear',
        y: lineY,
        progress: 0,
        duration: 300 // ms
      });
    });
  }

  animatePieceDrop(piece) {
    this.animationQueue.push({
      type: 'pieceDrop',
      piece: { ...piece },
      progress: 0,
      duration: 150
    });
  }

  processAnimations() {
    const now = Date.now();
    
    this.animationQueue = this.animationQueue.filter(anim => {
      anim.progress += 16; // Assume 60 FPS
      
      if (anim.type === 'lineClear') {
        this.renderLineClearAnimation(anim);
      } else if (anim.type === 'pieceDrop') {
        this.renderPieceDropAnimation(anim);
      }
      
      return anim.progress < anim.duration;
    });
  }

  renderLineClearAnimation(anim) {
    const progress = anim.progress / anim.duration;
    const alpha = 1 - progress;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, anim.y * this.blockSize, this.canvas.width, this.blockSize);
    this.ctx.restore();
  }

  renderPieceDropAnimation(anim) {
    if (!anim || !anim.piece) return;
    
    const progress = anim.progress / anim.duration;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    this.ctx.save();
    this.ctx.globalAlpha = 1 - easeOut;
    this.renderPiece(anim.piece);
    this.ctx.restore();
  }

  // UI Panel rendering
  renderUI(gameState, panelCanvas) {
    const ctx = panelCanvas.getContext('2d');
    const colors = this.themes[this.theme];
    
    ctx.fillStyle = colors.panel;
    ctx.fillRect(0, 0, panelCanvas.width, panelCanvas.height);
    
    // Score panel
    this.renderPanel(ctx, 10, 10, 180, 120, 'Score');
    this.renderText(ctx, `Score: ${gameState.score}`, 20, 40);
    this.renderText(ctx, `Level: ${gameState.level}`, 20, 60);
    this.renderText(ctx, `Lines: ${gameState.lines}`, 20, 80);
    
    // Next pieces panel
    this.renderPanel(ctx, 10, 140, 180, 200, 'Next');
    this.renderNextPieces(ctx, gameState.nextPieces, 20, 170);
    
    // Controls panel
    this.renderPanel(ctx, 10, 350, 180, 100, 'Controls');
    this.renderText(ctx, '← → ↓ Move', 20, 380, '10px');
    this.renderText(ctx, '↑ Rotate', 20, 395, '10px');
    this.renderText(ctx, 'Space Drop', 20, 410, '10px');
  }

  renderPanel(ctx, x, y, width, height, title) {
    const colors = this.themes[this.theme];
    
    // Panel background
    ctx.fillStyle = colors.panel;
    ctx.fillRect(x, y, width, height);
    
    // Win95-style border
    if (this.theme === 'win95') {
      ctx.strokeStyle = colors.panelBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Title bar
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(x + 2, y + 2, width - 4, 18);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "MS Sans Serif"';
      ctx.fillText(title, x + 6, y + 14);
    } else {
      ctx.strokeStyle = colors.panelBorder;
      ctx.strokeRect(x, y, width, height);
      
      ctx.fillStyle = colors.text;
      ctx.font = '12px monospace';
      ctx.fillText(title, x + 6, y + 16);
    }
  }

  renderText(ctx, text, x, y, size = '12px') {
    const colors = this.themes[this.theme];
    ctx.fillStyle = colors.text;
    ctx.font = `${size} ${this.theme === 'win95' ? '"MS Sans Serif"' : 'monospace'}`;
    ctx.fillText(text, x, y);
  }

  renderNextPieces(ctx, nextPieces, x, y) {
    nextPieces.slice(0, 3).forEach((piece, index) => {
      const offsetY = y + index * 60;
      this.renderMiniPiece(ctx, piece, x, offsetY);
    });
  }

  renderMiniPiece(ctx, piece, x, y) {
    const miniBlockSize = 12;
    const colors = this.themes[this.theme];
    const blockColor = colors.blockColors[piece.type];
    
    piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell !== 0) {
          const blockX = x + colIndex * miniBlockSize;
          const blockY = y + rowIndex * miniBlockSize;
          
          ctx.fillStyle = blockColor;
          ctx.fillRect(blockX, blockY, miniBlockSize, miniBlockSize);
          
          ctx.strokeStyle = colors.blockBorder;
          ctx.strokeRect(blockX, blockY, miniBlockSize, miniBlockSize);
        }
      });
    });
  }
}

export { Renderer };