// Strands Game Engine Agent - Manages game state and logic
import { Agent } from '../src/strands-sdk.js';
import { GameEngine } from '../src/game-engine.js';

class GameEngineAgent extends Agent {
  constructor(config = {}) {
    super({
      id: 'game-engine',
      name: 'Tetris Game Engine',
      capabilities: ['game-logic', 'state-management', 'collision-detection'],
      ...config
    });
    
    this.gameEngine = new GameEngine();
    this.gameState = 'initialized';
    this.subscribers = new Set();
    
    this.setupMessageHandlers();
  }

  async initialize() {
    await super.initialize();
    
    this.logger.info('Game Engine Agent initialized');
    
    // Register with orchestrator
    await this.registerCapabilities([
      'game-logic',
      'state-management', 
      'collision-detection',
      'piece-movement',
      'line-clearing'
    ]);
    
    this.gameState = 'ready';
  }

  setupMessageHandlers() {
    // Game control messages
    this.onMessage('START_GAME', this.handleStartGame.bind(this));
    this.onMessage('PAUSE_GAME', this.handlePauseGame.bind(this));
    this.onMessage('RESTART_GAME', this.handleRestartGame.bind(this));
    
    // Piece movement messages
    this.onMessage('MOVE_PIECE', this.handleMovePiece.bind(this));
    this.onMessage('ROTATE_PIECE', this.handleRotatePiece.bind(this));
    this.onMessage('DROP_PIECE', this.handleDropPiece.bind(this));
    
    // State query messages
    this.onMessage('GET_GAME_STATE', this.handleGetGameState.bind(this));
    this.onMessage('GET_GRID', this.handleGetGrid.bind(this));
    this.onMessage('GET_CURRENT_PIECE', this.handleGetCurrentPiece.bind(this));
    
    // Subscription messages
    this.onMessage('SUBSCRIBE_STATE_UPDATES', this.handleSubscribeStateUpdates.bind(this));
    this.onMessage('UNSUBSCRIBE_STATE_UPDATES', this.handleUnsubscribeStateUpdates.bind(this));
  }

  async handleStartGame(message) {
    try {
      this.gameEngine = new GameEngine();
      this.gameEngine.spawnNewPiece();
      this.gameState = 'playing';
      
      this.logger.info('Game started');
      
      // Notify subscribers
      await this.broadcastStateUpdate('GAME_STARTED');
      
      return {
        success: true,
        gameState: this.gameEngine.getState()
      };
    } catch (error) {
      this.logger.error('Failed to start game:', error);
      return { success: false, error: error.message };
    }
  }

  async handlePauseGame(message) {
    try {
      if (this.gameEngine.gameState === 'playing') {
        this.gameEngine.gameState = 'paused';
        this.gameState = 'paused';
      } else if (this.gameEngine.gameState === 'paused') {
        this.gameEngine.gameState = 'playing';
        this.gameState = 'playing';
      }
      
      await this.broadcastStateUpdate('GAME_PAUSED');
      
      return {
        success: true,
        gameState: this.gameEngine.gameState
      };
    } catch (error) {
      this.logger.error('Failed to pause/resume game:', error);
      return { success: false, error: error.message };
    }
  }

  async handleRestartGame(message) {
    try {
      this.gameEngine = new GameEngine();
      this.gameEngine.spawnNewPiece();
      this.gameState = 'playing';
      
      await this.broadcastStateUpdate('GAME_RESTARTED');
      
      return {
        success: true,
        gameState: this.gameEngine.getState()
      };
    } catch (error) {
      this.logger.error('Failed to restart game:', error);
      return { success: false, error: error.message };
    }
  }

  async handleMovePiece(message) {
    const startTime = performance.now();
    
    try {
      const { direction } = message.payload;
      
      if (!['left', 'right', 'down'].includes(direction)) {
        throw new Error(`Invalid direction: ${direction}`);
      }
      
      const moved = this.gameEngine.movePiece(direction);
      const endTime = performance.now();
      
      // Performance monitoring
      this.recordMetric('move_latency', endTime - startTime);
      
      if (moved) {
        await this.broadcastStateUpdate('PIECE_MOVED', { direction });
      } else if (direction === 'down') {
        await this.broadcastStateUpdate('PIECE_LOCKED');
      }
      
      return {
        success: true,
        moved,
        gameState: this.gameEngine.getState()
      };
    } catch (error) {
      this.logger.error('Failed to move piece:', error);
      return { success: false, error: error.message };
    }
  }

  async handleRotatePiece(message) {
    const startTime = performance.now();
    
    try {
      const rotated = this.gameEngine.rotatePiece();
      const endTime = performance.now();
      
      this.recordMetric('rotate_latency', endTime - startTime);
      
      if (rotated) {
        await this.broadcastStateUpdate('PIECE_ROTATED');
      }
      
      return {
        success: true,
        rotated,
        gameState: this.gameEngine.getState()
      };
    } catch (error) {
      this.logger.error('Failed to rotate piece:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDropPiece(message) {
    try {
      let dropDistance = 0;
      
      // Hard drop - move down until collision
      while (this.gameEngine.movePiece('down')) {
        dropDistance++;
      }
      
      // Bonus points for hard drop
      this.gameEngine.score += dropDistance * 2;
      
      await this.broadcastStateUpdate('PIECE_DROPPED', { dropDistance });
      
      return {
        success: true,
        dropDistance,
        gameState: this.gameEngine.getState()
      };
    } catch (error) {
      this.logger.error('Failed to drop piece:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetGameState(message) {
    return {
      success: true,
      gameState: this.gameEngine.getState()
    };
  }

  async handleGetGrid(message) {
    return {
      success: true,
      grid: this.gameEngine.grid.map(row => [...row])
    };
  }

  async handleGetCurrentPiece(message) {
    const currentPiece = this.gameEngine.currentPiece;
    
    return {
      success: true,
      currentPiece: currentPiece ? {
        type: currentPiece.type,
        x: currentPiece.x,
        y: currentPiece.y,
        rotation: currentPiece.rotation,
        shape: currentPiece.getShape()
      } : null
    };
  }

  async handleSubscribeStateUpdates(message) {
    const { agentId } = message.payload;
    this.subscribers.add(agentId);
    
    this.logger.info(`Agent ${agentId} subscribed to state updates`);
    
    return { success: true };
  }

  async handleUnsubscribeStateUpdates(message) {
    const { agentId } = message.payload;
    this.subscribers.delete(agentId);
    
    this.logger.info(`Agent ${agentId} unsubscribed from state updates`);
    
    return { success: true };
  }

  async broadcastStateUpdate(eventType, eventData = {}) {
    const updateMessage = {
      type: 'GAME_STATE_UPDATE',
      payload: {
        eventType,
        eventData,
        gameState: this.gameEngine.getState(),
        timestamp: Date.now()
      }
    };
    
    // Broadcast to all subscribers
    const promises = Array.from(this.subscribers).map(agentId =>
      this.sendMessage(agentId, updateMessage).catch(error =>
        this.logger.warn(`Failed to notify ${agentId}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }

  // Game loop integration
  async update(deltaTime) {
    if (this.gameEngine.gameState === 'playing') {
      const previousState = this.gameEngine.getState();
      
      this.gameEngine.update(deltaTime);
      
      const currentState = this.gameEngine.getState();
      
      // Check for state changes that need broadcasting
      if (this.hasSignificantStateChange(previousState, currentState)) {
        await this.broadcastStateUpdate('GAME_TICK');
      }
      
      // Check for game over
      if (currentState.gameState === 'gameOver' && previousState.gameState !== 'gameOver') {
        await this.broadcastStateUpdate('GAME_OVER');
      }
    }
  }

  hasSignificantStateChange(previous, current) {
    return (
      previous.score !== current.score ||
      previous.level !== current.level ||
      previous.lines !== current.lines ||
      previous.gameState !== current.gameState
    );
  }

  // Performance monitoring
  recordMetric(name, value) {
    this.metrics = this.metrics || {};
    this.metrics[name] = this.metrics[name] || [];
    this.metrics[name].push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last 100 measurements
    if (this.metrics[name].length > 100) {
      this.metrics[name] = this.metrics[name].slice(-100);
    }
  }

  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [name, values] of Object.entries(this.metrics || {})) {
      const recentValues = values.slice(-50).map(v => v.value);
      
      metrics[name] = {
        count: recentValues.length,
        avg: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
        min: Math.min(...recentValues),
        max: Math.max(...recentValues),
        p95: this.percentile(recentValues, 0.95)
      };
    }
    
    return metrics;
  }

  percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  async healthCheck() {
    const metrics = this.getPerformanceMetrics();
    
    // Check performance thresholds
    const issues = [];
    
    if (metrics.move_latency?.avg > 1) {
      issues.push('High move latency');
    }
    
    if (metrics.rotate_latency?.avg > 1) {
      issues.push('High rotation latency');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      metrics,
      gameState: this.gameState,
      uptime: Date.now() - this.startTime
    };
  }

  async shutdown() {
    this.logger.info('Shutting down Game Engine Agent');
    
    // Notify subscribers
    await this.broadcastStateUpdate('AGENT_SHUTDOWN');
    
    // Clear subscribers
    this.subscribers.clear();
    
    await super.shutdown();
  }
}

export { GameEngineAgent };