// Comprehensive replay system with AI annotations
class ReplaySystem {
  constructor() {
    this.inputs = [];
    this.states = [];
    this.annotations = [];
    this.startTime = null;
    this.isRecording = false;
    this.isPlaying = false;
    this.playbackIndex = 0;
    this.playbackSpeed = 1.0;
  }

  startRecording() {
    this.reset();
    this.isRecording = true;
    this.startTime = Date.now();
  }

  stopRecording() {
    this.isRecording = false;
  }

  reset() {
    this.inputs = [];
    this.states = [];
    this.annotations = [];
    this.startTime = null;
    this.isRecording = false;
    this.isPlaying = false;
    this.playbackIndex = 0;
  }

  recordInput(action, timestamp) {
    if (!this.isRecording) return;
    
    const relativeTime = timestamp - this.startTime;
    this.inputs.push({
      action,
      timestamp: relativeTime,
      frameIndex: this.states.length
    });
  }

  recordState(gameState, timestamp) {
    if (!this.isRecording) return;
    
    const relativeTime = timestamp - this.startTime;
    
    // Compress state to reduce memory usage
    const compressedState = this.compressState(gameState);
    
    this.states.push({
      state: compressedState,
      timestamp: relativeTime,
      frameIndex: this.states.length
    });
    
    // Analyze state for AI annotations
    this.analyzeStateForAnnotations(gameState, relativeTime);
  }

  compressState(gameState) {
    // Only store essential state data
    return {
      grid: this.compressGrid(gameState.grid),
      currentPiece: gameState.currentPiece ? {
        type: gameState.currentPiece.type,
        x: gameState.currentPiece.x,
        y: gameState.currentPiece.y,
        rotation: gameState.currentPiece.rotation
      } : null,
      score: gameState.score,
      level: gameState.level,
      lines: gameState.lines,
      gameState: gameState.gameState
    };
  }

  compressGrid(grid) {
    // Run-length encoding for sparse grids
    const compressed = [];
    
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      const compressedRow = [];
      
      let currentValue = row[0];
      let count = 1;
      
      for (let x = 1; x < row.length; x++) {
        if (row[x] === currentValue) {
          count++;
        } else {
          compressedRow.push([currentValue, count]);
          currentValue = row[x];
          count = 1;
        }
      }
      compressedRow.push([currentValue, count]);
      compressed.push(compressedRow);
    }
    
    return compressed;
  }

  decompressGrid(compressed) {
    const grid = [];
    
    for (let y = 0; y < compressed.length; y++) {
      const row = [];
      const compressedRow = compressed[y];
      
      for (const [value, count] of compressedRow) {
        for (let i = 0; i < count; i++) {
          row.push(value);
        }
      }
      grid.push(row);
    }
    
    return grid;
  }

  analyzeStateForAnnotations(gameState, timestamp) {
    // Analyze current state for interesting events
    const annotations = [];
    
    // Check for line clears
    const fullLines = this.findFullLines(gameState.grid);
    if (fullLines.length > 0) {
      annotations.push({
        type: 'lineClear',
        lines: fullLines.length,
        message: `${fullLines.length} line${fullLines.length > 1 ? 's' : ''} cleared!`,
        importance: fullLines.length >= 4 ? 'high' : 'medium'
      });
    }
    
    // Check for dangerous situations
    const dangerLevel = this.calculateDangerLevel(gameState.grid);
    if (dangerLevel > 0.8) {
      annotations.push({
        type: 'danger',
        level: dangerLevel,
        message: 'Critical situation! Grid is nearly full.',
        importance: 'high'
      });
    }
    
    // Check for good moves (would need AI analysis)
    const moveQuality = this.analyzeMoveQuality(gameState);
    if (moveQuality.score > 0.9) {
      annotations.push({
        type: 'goodMove',
        score: moveQuality.score,
        message: moveQuality.reason,
        importance: 'medium'
      });
    }
    
    if (annotations.length > 0) {
      this.annotations.push({
        timestamp,
        frameIndex: this.states.length - 1,
        annotations
      });
    }
  }

  findFullLines(grid) {
    const fullLines = [];
    for (let y = 0; y < grid.length; y++) {
      if (grid[y].every(cell => cell !== 0)) {
        fullLines.push(y);
      }
    }
    return fullLines;
  }

  calculateDangerLevel(grid) {
    // Calculate how full the top portion of the grid is
    const topRows = 4;
    let filledCells = 0;
    let totalCells = 0;
    
    for (let y = 0; y < topRows; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== 0) filledCells++;
        totalCells++;
      }
    }
    
    return filledCells / totalCells;
  }

  analyzeMoveQuality(gameState) {
    // Simple heuristic-based move analysis
    // In a full implementation, this would use the AI Predictor Agent
    
    const grid = gameState.grid;
    const holes = this.countHoles(grid);
    const height = this.getMaxHeight(grid);
    const bumpiness = this.getBumpiness(grid);
    
    // Lower is better for these metrics
    const score = 1 / (1 + holes * 0.5 + height * 0.1 + bumpiness * 0.2);
    
    let reason = 'Good placement';
    if (holes === 0) reason = 'No holes created';
    if (height < 10) reason = 'Keeping height low';
    
    return { score, reason };
  }

  countHoles(grid) {
    let holes = 0;
    for (let x = 0; x < 10; x++) {
      let foundBlock = false;
      for (let y = 0; y < 20; y++) {
        if (grid[y][x] !== 0) {
          foundBlock = true;
        } else if (foundBlock) {
          holes++;
        }
      }
    }
    return holes;
  }

  getMaxHeight(grid) {
    for (let y = 0; y < 20; y++) {
      if (grid[y].some(cell => cell !== 0)) {
        return 20 - y;
      }
    }
    return 0;
  }

  getBumpiness(grid) {
    const heights = [];
    for (let x = 0; x < 10; x++) {
      let height = 0;
      for (let y = 0; y < 20; y++) {
        if (grid[y][x] !== 0) {
          height = 20 - y;
          break;
        }
      }
      heights.push(height);
    }
    
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    return bumpiness;
  }

  startPlayback(renderCallback, speed = 1.0) {
    if (this.states.length === 0) return;
    
    this.isPlaying = true;
    this.playbackIndex = 0;
    this.playbackSpeed = speed;
    
    this.playbackLoop(renderCallback);
  }

  playbackLoop(renderCallback) {
    if (!this.isPlaying || this.playbackIndex >= this.states.length) {
      this.isPlaying = false;
      return;
    }
    
    const currentFrame = this.states[this.playbackIndex];
    const decompressedState = {
      ...currentFrame.state,
      grid: this.decompressGrid(currentFrame.state.grid)
    };
    
    // Render current frame
    renderCallback(decompressedState);
    
    // Show annotations for this frame
    this.showAnnotationsForFrame(this.playbackIndex);
    
    // Calculate delay to next frame
    const nextFrame = this.states[this.playbackIndex + 1];
    const delay = nextFrame ? 
      (nextFrame.timestamp - currentFrame.timestamp) / this.playbackSpeed : 
      100;
    
    this.playbackIndex++;
    
    setTimeout(() => this.playbackLoop(renderCallback), Math.max(16, delay));
  }

  showAnnotationsForFrame(frameIndex) {
    const frameAnnotations = this.annotations.filter(
      ann => ann.frameIndex === frameIndex
    );
    
    frameAnnotations.forEach(ann => {
      this.displayAnnotation(ann);
    });
  }

  displayAnnotation(annotation) {
    // Create floating annotation UI
    const annotationEl = document.createElement('div');
    annotationEl.className = `annotation annotation-${annotation.annotations[0].importance}`;
    annotationEl.textContent = annotation.annotations[0].message;
    
    // Position near the game area
    annotationEl.style.position = 'absolute';
    annotationEl.style.top = '50px';
    annotationEl.style.right = '20px';
    annotationEl.style.padding = '8px 12px';
    annotationEl.style.borderRadius = '4px';
    annotationEl.style.backgroundColor = this.getAnnotationColor(annotation.annotations[0].importance);
    annotationEl.style.color = 'white';
    annotationEl.style.fontSize = '12px';
    annotationEl.style.zIndex = '1000';
    
    document.body.appendChild(annotationEl);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (annotationEl.parentNode) {
        annotationEl.parentNode.removeChild(annotationEl);
      }
    }, 3000);
  }

  getAnnotationColor(importance) {
    switch (importance) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#666666';
    }
  }

  pausePlayback() {
    this.isPlaying = false;
  }

  resumePlayback(renderCallback) {
    if (!this.isPlaying && this.playbackIndex < this.states.length) {
      this.isPlaying = true;
      this.playbackLoop(renderCallback);
    }
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  seekToFrame(frameIndex) {
    this.playbackIndex = Math.max(0, Math.min(frameIndex, this.states.length - 1));
  }

  seekToTime(timestamp) {
    const frameIndex = this.states.findIndex(state => state.timestamp >= timestamp);
    if (frameIndex !== -1) {
      this.seekToFrame(frameIndex);
    }
  }

  exportReplay() {
    return {
      version: '1.0',
      startTime: this.startTime,
      duration: this.states.length > 0 ? this.states[this.states.length - 1].timestamp : 0,
      inputs: this.inputs,
      states: this.states,
      annotations: this.annotations,
      metadata: {
        gameVersion: '1.0',
        exportTime: Date.now()
      }
    };
  }

  importReplay(replayData) {
    if (replayData.version !== '1.0') {
      throw new Error('Unsupported replay version');
    }
    
    this.reset();
    this.startTime = replayData.startTime;
    this.inputs = replayData.inputs;
    this.states = replayData.states;
    this.annotations = replayData.annotations;
  }

  getReplayData() {
    return this.exportReplay();
  }

  hasReplay() {
    return this.states.length > 0;
  }

  finalize() {
    this.stopRecording();
    
    // Generate summary statistics
    const summary = this.generateSummary();
    
    // Save to local storage
    this.saveToLocalStorage();
    
    return summary;
  }

  generateSummary() {
    if (this.states.length === 0) return null;
    
    const finalState = this.states[this.states.length - 1].state;
    const duration = this.states[this.states.length - 1].timestamp;
    
    return {
      finalScore: finalState.score,
      finalLevel: finalState.level,
      totalLines: finalState.lines,
      duration: duration,
      totalInputs: this.inputs.length,
      annotationCount: this.annotations.length,
      averageAPM: (this.inputs.length / (duration / 1000)) * 60 // Actions per minute
    };
  }

  saveToLocalStorage() {
    try {
      const replayData = this.exportReplay();
      const key = `tetris-replay-${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(replayData));
      
      // Keep only last 10 replays
      this.cleanupOldReplays();
      
      return key;
    } catch (error) {
      console.warn('Failed to save replay:', error);
      return null;
    }
  }

  cleanupOldReplays() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('tetris-replay-'));
    
    if (keys.length > 10) {
      keys.sort().slice(0, keys.length - 10).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }
}

export { ReplaySystem };