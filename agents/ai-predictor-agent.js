// Strands AI Predictor Agent - Provides intelligent move suggestions
import { Agent } from '../src/strands-sdk.js';

class AIPredictorAgent extends Agent {
  constructor(config = {}) {
    super({
      id: 'ai-predictor',
      name: 'Tetris AI Predictor',
      capabilities: ['move-prediction', 'board-analysis', 'difficulty-adaptation'],
      ...config
    });
    
    this.difficultyLevel = 1;
    this.predictionCache = new Map();
    this.heuristicWeights = {
      height: -0.510066,
      lines: 0.760666,
      holes: -0.35663,
      bumpiness: -0.184483
    };
    
    this.setupMessageHandlers();
  }

  async initialize() {
    await super.initialize();
    
    this.logger.info('AI Predictor Agent initialized');
    
    // Register capabilities
    await this.registerCapabilities([
      'move-prediction',
      'board-analysis',
      'placement-scoring',
      'lookahead-calculation',
      'difficulty-adaptation'
    ]);
    
    // Load AI model if available
    await this.loadAIModel();
  }

  setupMessageHandlers() {
    // Prediction requests
    this.onMessage('PREDICT_BEST_MOVE', this.handlePredictBestMove.bind(this));
    this.onMessage('ANALYZE_BOARD', this.handleAnalyzeBoard.bind(this));
    this.onMessage('SCORE_PLACEMENT', this.handleScorePlacement.bind(this));
    this.onMessage('CALCULATE_LOOKAHEAD', this.handleCalculateLookahead.bind(this));
    
    // Configuration
    this.onMessage('SET_DIFFICULTY', this.handleSetDifficulty.bind(this));
    this.onMessage('UPDATE_WEIGHTS', this.handleUpdateWeights.bind(this));
    
    // Game state updates from Game Engine Agent
    this.onMessage('GAME_STATE_UPDATE', this.handleGameStateUpdate.bind(this));
  }

  async loadAIModel() {
    try {
      // In a full implementation, this would load a trained neural network
      // For now, we'll use heuristic-based AI
      
      const modelConfig = (typeof process !== 'undefined' && process.env) ? process.env.AI_MODEL_CONFIG : null;
      if (modelConfig) {
        this.logger.info('Loading AI model configuration');
        // Load model weights, etc.
      }
      
      this.aiModelLoaded = true;
    } catch (error) {
      this.logger.warn('Failed to load AI model, using heuristics:', error);
      this.aiModelLoaded = false;
    }
  }

  async handlePredictBestMove(message) {
    const startTime = performance.now();
    
    try {
      const { piece, grid, nextPieces = [] } = message.payload;
      
      // Check cache first
      const cacheKey = this.generateCacheKey(piece, grid);
      if (this.predictionCache.has(cacheKey)) {
        const cached = this.predictionCache.get(cacheKey);
        return {
          success: true,
          prediction: cached,
          cached: true,
          processingTime: performance.now() - startTime
        };
      }
      
      // Generate all possible moves
      const possibleMoves = this.generatePossibleMoves(piece, grid);
      
      // Score each move
      const scoredMoves = await Promise.all(
        possibleMoves.map(async move => ({
          ...move,
          score: await this.scorePlacement(piece, move, grid, nextPieces)
        }))
      );
      
      // Sort by score (highest first)
      scoredMoves.sort((a, b) => b.score - a.score);
      
      const bestMove = scoredMoves[0];
      const confidence = this.calculateConfidence(scoredMoves);
      
      const prediction = {
        move: bestMove,
        confidence,
        alternatives: scoredMoves.slice(1, 4), // Top 3 alternatives
        reasoning: this.generateReasoning(bestMove, grid)
      };
      
      // Cache the result
      this.predictionCache.set(cacheKey, prediction);
      this.cleanupCache();
      
      const processingTime = performance.now() - startTime;
      this.recordMetric('prediction_time', processingTime);
      
      return {
        success: true,
        prediction,
        processingTime
      };
    } catch (error) {
      this.logger.error('Failed to predict best move:', error);
      return { success: false, error: error.message };
    }
  }

  generatePossibleMoves(piece, grid) {
    const moves = [];
    
    // Try all rotations
    for (let rotation = 0; rotation < 4; rotation++) {
      const rotatedPiece = { ...piece, rotation };
      const shape = this.getShapeForRotation(piece.type, rotation);
      
      // Try all horizontal positions
      for (let x = -3; x < 13; x++) {
        // Find the lowest valid position
        let y = 0;
        while (y < 20 && !this.checkCollision(shape, x, y, grid)) {
          y++;
        }
        y--; // Back up to last valid position
        
        if (y >= 0 && !this.checkCollision(shape, x, y, grid)) {
          moves.push({ x, y, rotation });
        }
      }
    }
    
    return moves;
  }

  async scorePlacement(piece, move, grid, nextPieces = []) {
    // Create a copy of the grid with the piece placed
    const testGrid = this.placepiece(piece, move, grid);
    
    // Clear any completed lines
    const { clearedGrid, linesCleared } = this.clearLines(testGrid);
    
    // Calculate heuristic score
    const heuristicScore = this.calculateHeuristicScore(clearedGrid, linesCleared);
    
    // Apply difficulty-based accuracy
    const accuracyFactor = this.getDifficultyAccuracy();
    const noise = (Math.random() - 0.5) * (1 - accuracyFactor) * 0.2;
    
    let finalScore = heuristicScore + noise;
    
    // Lookahead scoring if next pieces available
    if (nextPieces.length > 0) {
      const lookaheadScore = await this.calculateLookaheadScore(
        clearedGrid, 
        nextPieces.slice(0, 2), // Look 2 pieces ahead
        2
      );
      finalScore = (finalScore * 0.7) + (lookaheadScore * 0.3);
    }
    
    return Math.max(0, Math.min(100, finalScore));
  }

  calculateHeuristicScore(grid, linesCleared) {
    const height = this.getAggregateHeight(grid);
    const holes = this.getHoles(grid);
    const bumpiness = this.getBumpiness(grid);
    
    return (
      this.heuristicWeights.height * height +
      this.heuristicWeights.lines * linesCleared +
      this.heuristicWeights.holes * holes +
      this.heuristicWeights.bumpiness * bumpiness
    );
  }

  async calculateLookaheadScore(grid, nextPieces, depth) {
    if (depth === 0 || nextPieces.length === 0) {
      return this.calculateHeuristicScore(grid, 0);
    }
    
    const piece = nextPieces[0];
    const possibleMoves = this.generatePossibleMoves(piece, grid);
    
    let bestScore = -Infinity;
    
    for (const move of possibleMoves.slice(0, 5)) { // Limit for performance
      const testGrid = this.placepiece(piece, move, grid);
      const { clearedGrid, linesCleared } = this.clearLines(testGrid);
      
      const immediateScore = this.calculateHeuristicScore(clearedGrid, linesCleared);
      const futureScore = await this.calculateLookaheadScore(
        clearedGrid,
        nextPieces.slice(1),
        depth - 1
      );
      
      const totalScore = immediateScore + (futureScore * 0.8); // Discount future
      bestScore = Math.max(bestScore, totalScore);
    }
    
    return bestScore;
  }

  placepiece(piece, move, grid) {
    const newGrid = grid.map(row => [...row]);
    const shape = this.getShapeForRotation(piece.type, move.rotation);
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const gridX = move.x + x;
          const gridY = move.y + y;
          
          if (gridY >= 0 && gridY < 20 && gridX >= 0 && gridX < 10) {
            newGrid[gridY][gridX] = piece.type;
          }
        }
      }
    }
    
    return newGrid;
  }

  clearLines(grid) {
    const newGrid = [];
    let linesCleared = 0;
    
    for (let y = 0; y < grid.length; y++) {
      if (!grid[y].every(cell => cell !== 0)) {
        newGrid.push([...grid[y]]);
      } else {
        linesCleared++;
      }
    }
    
    // Add empty lines at the top
    while (newGrid.length < 20) {
      newGrid.unshift(new Array(10).fill(0));
    }
    
    return { clearedGrid: newGrid, linesCleared };
  }

  getAggregateHeight(grid) {
    let totalHeight = 0;
    
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 20; y++) {
        if (grid[y][x] !== 0) {
          totalHeight += (20 - y);
          break;
        }
      }
    }
    
    return totalHeight;
  }

  getHoles(grid) {
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

  checkCollision(shape, x, y, grid) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        
        const newX = x + col;
        const newY = y + row;
        
        if (newX < 0 || newX >= 10 || newY >= 20) return true;
        if (newY < 0) continue;
        if (grid[newY][newX] !== 0) return true;
      }
    }
    return false;
  }

  getShapeForRotation(pieceType, rotation) {
    // Tetromino shapes for each rotation
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
    
    return shapes[pieceType][rotation % 4];
  }

  calculateConfidence(scoredMoves) {
    if (scoredMoves.length < 2) return 1.0;
    
    const bestScore = scoredMoves[0].score;
    const secondBestScore = scoredMoves[1].score;
    
    // Confidence based on score difference
    const scoreDiff = bestScore - secondBestScore;
    const confidence = Math.min(1.0, scoreDiff / 20); // Normalize to 0-1
    
    // Apply difficulty-based confidence adjustment
    const difficultyFactor = this.getDifficultyAccuracy();
    
    return confidence * difficultyFactor;
  }

  getDifficultyAccuracy() {
    // Accuracy increases with difficulty level
    // Level 1: 60%, Level 10: 95%
    return 0.6 + (this.difficultyLevel - 1) * 0.035;
  }

  generateReasoning(bestMove, grid) {
    const reasons = [];
    
    // Analyze the move
    if (bestMove.score > 80) {
      reasons.push('Excellent placement');
    } else if (bestMove.score > 60) {
      reasons.push('Good placement');
    } else if (bestMove.score > 40) {
      reasons.push('Acceptable placement');
    } else {
      reasons.push('Defensive placement');
    }
    
    // Check for line clears
    const testGrid = this.placepiece({ type: 'I' }, bestMove, grid);
    const { linesCleared } = this.clearLines(testGrid);
    
    if (linesCleared > 0) {
      reasons.push(`Clears ${linesCleared} line${linesCleared > 1 ? 's' : ''}`);
    }
    
    // Check for holes
    const holes = this.getHoles(testGrid);
    if (holes === 0) {
      reasons.push('Creates no holes');
    } else if (holes > 3) {
      reasons.push('Minimizes hole creation');
    }
    
    return reasons.join(', ');
  }

  generateCacheKey(piece, grid) {
    // Create a hash of the piece and grid state
    const pieceKey = `${piece.type}-${piece.x}-${piece.y}-${piece.rotation}`;
    const gridKey = grid.map(row => row.join('')).join('');
    return `${pieceKey}:${this.hashString(gridKey)}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  cleanupCache() {
    // Keep cache size under control
    if (this.predictionCache.size > 1000) {
      const keys = Array.from(this.predictionCache.keys());
      const keysToDelete = keys.slice(0, 500); // Remove oldest half
      
      keysToDelete.forEach(key => this.predictionCache.delete(key));
    }
  }

  async handleAnalyzeBoard(message) {
    try {
      const { grid } = message.payload;
      
      const analysis = {
        height: this.getAggregateHeight(grid),
        holes: this.getHoles(grid),
        bumpiness: this.getBumpiness(grid),
        dangerLevel: this.calculateDangerLevel(grid),
        recommendations: this.generateRecommendations(grid)
      };
      
      return { success: true, analysis };
    } catch (error) {
      this.logger.error('Failed to analyze board:', error);
      return { success: false, error: error.message };
    }
  }

  calculateDangerLevel(grid) {
    const maxHeight = Math.max(...Array.from({ length: 10 }, (_, x) => {
      for (let y = 0; y < 20; y++) {
        if (grid[y][x] !== 0) return 20 - y;
      }
      return 0;
    }));
    
    return Math.min(1.0, maxHeight / 15); // Danger increases as height approaches 15
  }

  generateRecommendations(grid) {
    const recommendations = [];
    
    const holes = this.getHoles(grid);
    if (holes > 5) {
      recommendations.push('Focus on clearing lines to reduce holes');
    }
    
    const dangerLevel = this.calculateDangerLevel(grid);
    if (dangerLevel > 0.7) {
      recommendations.push('Critical: Clear lines immediately');
    }
    
    const bumpiness = this.getBumpiness(grid);
    if (bumpiness > 10) {
      recommendations.push('Try to even out the surface');
    }
    
    return recommendations;
  }

  async handleScorePlacement(message) {
    try {
      const { piece, move, grid, nextPieces } = message.payload;
      const score = await this.scorePlacement(piece, move, grid, nextPieces);
      return { success: true, score };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleCalculateLookahead(message) {
    try {
      const { pieces, grid, depth } = message.payload;
      const moves = await this.calculateLookaheadScore(grid, pieces, depth);
      return { success: true, moves };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleUpdateWeights(message) {
    try {
      const { weights } = message.payload;
      this.heuristicWeights = { ...this.heuristicWeights, ...weights };
      return { success: true, weights: this.heuristicWeights };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleSetDifficulty(message) {
    const { level } = message.payload;
    
    if (level >= 1 && level <= 10) {
      this.difficultyLevel = level;
      this.logger.info(`Difficulty set to level ${level}`);
      return { success: true, level: this.difficultyLevel };
    }
    
    return { success: false, error: 'Invalid difficulty level' };
  }

  async handleGameStateUpdate(message) {
    const { eventType, gameState } = message.payload;
    
    // Clear cache on significant state changes
    if (['GAME_STARTED', 'GAME_RESTARTED'].includes(eventType)) {
      this.predictionCache.clear();
    }
    
    // Adapt difficulty based on performance
    if (eventType === 'PIECE_LOCKED') {
      this.adaptDifficulty(gameState);
    }
  }

  adaptDifficulty(gameState) {
    // Simple adaptive difficulty based on score and level
    const targetLevel = Math.min(10, Math.floor(gameState.score / 10000) + 1);
    
    if (targetLevel !== this.difficultyLevel) {
      this.difficultyLevel = targetLevel;
      this.logger.info(`Auto-adjusted difficulty to level ${targetLevel}`);
    }
  }

  recordMetric(name, value) {
    this.metrics = this.metrics || {};
    this.metrics[name] = this.metrics[name] || [];
    this.metrics[name].push({ value, timestamp: Date.now() });
    
    // Keep only recent metrics
    if (this.metrics[name].length > 100) {
      this.metrics[name] = this.metrics[name].slice(-100);
    }
  }

  async healthCheck() {
    const cacheSize = this.predictionCache.size;
    const metrics = this.getPerformanceMetrics();
    
    const issues = [];
    
    if (metrics.prediction_time?.avg > 100) {
      issues.push('High prediction latency');
    }
    
    if (cacheSize > 800) {
      issues.push('Cache size approaching limit');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      metrics,
      cacheSize,
      difficultyLevel: this.difficultyLevel,
      aiModelLoaded: this.aiModelLoaded
    };
  }

  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [name, values] of Object.entries(this.metrics || {})) {
      const recentValues = values.slice(-50).map(v => v.value);
      
      if (recentValues.length > 0) {
        metrics[name] = {
          count: recentValues.length,
          avg: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
          min: Math.min(...recentValues),
          max: Math.max(...recentValues)
        };
      }
    }
    
    return metrics;
  }
}

export { AIPredictorAgent };