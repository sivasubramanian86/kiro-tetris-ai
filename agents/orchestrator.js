// Strands Orchestrator - Coordinates multi-agent communication and workflows
import { Orchestrator } from '../src/strands-sdk.js';
import { GameEngineAgent } from './game-engine-agent.js';
import { AIPredictorAgent } from './ai-predictor-agent.js';
import { UIControllerAgent } from './ui-controller-agent.js';

class TetrisOrchestrator extends Orchestrator {
  constructor(config = {}) {
    super({
      id: 'tetris-orchestrator',
      name: 'Tetris Game Orchestrator',
      ...config
    });

    this.config = config;

    this.agents = new Map();
    this.messageQueue = [];
    this.circuitBreakers = new Map();
    this.performanceMetrics = new Map();
    this.gameLoop = null;
    this.isRunning = false;

    this.setupMessageRouting();
    this.setupCircuitBreakers();
  }

  async initialize() {
    await super.initialize();

    this.logger.info('Tetris Orchestrator initializing...');

    // Initialize and register agents
    await this.initializeAgents();

    // Setup inter-agent communication
    await this.setupCommunication();

    // Start monitoring
    this.startHealthMonitoring();

    this.logger.info('Tetris Orchestrator initialized successfully');
  }

  async initializeAgents() {
    try {
      // Initialize Game Engine Agent
      const gameEngine = new GameEngineAgent({
        orchestratorId: this.id,
        logLevel: this.config.logLevel || 'info'
      });
      await gameEngine.initialize();
      this.agents.set('game-engine', gameEngine);

      // Initialize AI Predictor Agent
      const aiPredictor = new AIPredictorAgent({
        orchestratorId: this.id,
        logLevel: this.config.logLevel || 'info'
      });
      await aiPredictor.initialize();
      this.agents.set('ai-predictor', aiPredictor);

      // Initialize UI Controller Agent (only in browser)
      if (typeof window !== 'undefined') {
        const uiController = new UIControllerAgent({
          orchestratorId: this.id,
          logLevel: this.config.logLevel || 'info'
        });
        await uiController.initialize();
        this.agents.set('ui-controller', uiController);
      }

      this.logger.info('All agents initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize agents:', error);
      throw error;
    }
  }

  async setupCommunication() {
    // Subscribe UI Controller to Game Engine state updates
    await this.routeMessage('ui-controller', 'game-engine', {
      type: 'SUBSCRIBE_STATE_UPDATES',
      payload: { agentId: 'ui-controller' }
    });

    // Subscribe AI Predictor to Game Engine state updates
    await this.routeMessage('ai-predictor', 'game-engine', {
      type: 'SUBSCRIBE_STATE_UPDATES',
      payload: { agentId: 'ai-predictor' }
    });

    this.logger.info('Inter-agent communication setup complete');
  }

  setupMessageRouting() {
    // Define message routing patterns
    this.routingTable = {
      // Game control messages go to Game Engine
      'START_GAME': 'game-engine',
      'PAUSE_GAME': 'game-engine',
      'RESTART_GAME': 'game-engine',
      'MOVE_PIECE': 'game-engine',
      'ROTATE_PIECE': 'game-engine',
      'DROP_PIECE': 'game-engine',

      // AI prediction messages go to AI Predictor
      'PREDICT_BEST_MOVE': 'ai-predictor',
      'ANALYZE_BOARD': 'ai-predictor',
      'SET_DIFFICULTY': 'ai-predictor',

      // UI messages go to UI Controller
      'RENDER_FRAME': 'ui-controller',
      'SET_THEME': 'ui-controller',
      'SHOW_DIALOG': 'ui-controller',
      'ANIMATE_LINE_CLEAR': 'ui-controller',

      // Input events are processed by orchestrator first
      'INPUT_EVENT': 'orchestrator'
    };
  }

  setupCircuitBreakers() {
    // Configure circuit breakers for each agent
    const circuitBreakerConfig = {
      threshold: 5,        // failures before opening
      timeout: 30000,      // 30 seconds
      monitoringPeriod: 60000  // 1 minute
    };

    for (const agentId of ['game-engine', 'ai-predictor', 'ui-controller']) {
      this.circuitBreakers.set(agentId, {
        ...circuitBreakerConfig,
        failures: 0,
        state: 'CLOSED',
        lastFailure: 0,
        nextAttempt: 0
      });
    }
  }

  async routeMessage(fromAgent, toAgent, message) {
    const startTime = performance.now();

    try {
      // Check circuit breaker
      if (!this.isCircuitClosed(toAgent)) {
        throw new Error(`Circuit breaker open for agent: ${toAgent}`);
      }

      // Add routing metadata
      const routedMessage = {
        ...message,
        metadata: {
          fromAgent,
          toAgent,
          timestamp: Date.now(),
          routingId: this.generateRoutingId()
        }
      };

      // Get target agent
      const targetAgent = this.agents.get(toAgent);
      if (!targetAgent) {
        throw new Error(`Agent not found: ${toAgent}`);
      }

      // Route the message
      const response = await targetAgent.handleMessage(routedMessage);

      // Record success
      this.recordSuccess(toAgent);

      const latency = performance.now() - startTime;
      this.recordMetric('message_latency', latency, { fromAgent, toAgent });

      // Log slow messages
      if (latency > 10) {
        this.logger.warn(`Slow message routing: ${fromAgent} → ${toAgent}: ${latency.toFixed(2)}ms`);
      }

      return response;
    } catch (error) {
      this.recordFailure(toAgent, error);
      this.logger.error(`Message routing failed: ${fromAgent} → ${toAgent}:`, error);

      // Attempt graceful degradation
      return this.handleRoutingFailure(fromAgent, toAgent, message, error);
    }
  }

  async handleInputEvent(inputEvent) {
    try {
      const { inputType, key, x, y } = inputEvent.payload;

      // Process input based on type
      if (inputType === 'keyboard') {
        return this.handleKeyboardInput(key);
      } else if (inputType === 'mouse') {
        return this.handleMouseInput(x, y);
      } else if (inputType === 'touch') {
        return this.handleTouchInput(x, y);
      }

      return { success: false, error: 'Unknown input type' };
    } catch (error) {
      this.logger.error('Failed to handle input event:', error);
      return { success: false, error: error.message };
    }
  }

  async handleKeyboardInput(key) {
    // Map keyboard input to game actions
    const keyMappings = {
      'ArrowLeft': { type: 'MOVE_PIECE', payload: { direction: 'left' } },
      'ArrowRight': { type: 'MOVE_PIECE', payload: { direction: 'right' } },
      'ArrowDown': { type: 'MOVE_PIECE', payload: { direction: 'down' } },
      'ArrowUp': { type: 'ROTATE_PIECE', payload: {} },
      ' ': { type: 'DROP_PIECE', payload: {} },
      'Escape': { type: 'PAUSE_GAME', payload: {} },
      'p': { type: 'PAUSE_GAME', payload: {} },
      'r': { type: 'RESTART_GAME', payload: {} }
    };

    const action = keyMappings[key];
    if (action) {
      // Route to appropriate agent
      const targetAgent = this.routingTable[action.type];
      if (targetAgent) {
        return this.routeMessage('orchestrator', targetAgent, action);
      }
    }

    return { success: false, error: 'Unmapped key' };
  }

  async handleMouseInput(x, y) {
    // Handle mouse input for UI elements
    // This would typically be processed by the UI Controller
    return this.routeMessage('orchestrator', 'ui-controller', {
      type: 'HANDLE_MOUSE_INPUT',
      payload: { x, y }
    });
  }

  async handleTouchInput(x, y) {
    // Convert touch to appropriate game action
    // This is a simplified implementation
    return this.handleMouseInput(x, y);
  }

  async startGame(options = {}) {
    try {
      this.logger.info('Starting new game...');

      const { skipLoop = false } = options;

      // Start game engine
      const gameResult = await this.routeMessage('orchestrator', 'game-engine', {
        type: 'START_GAME',
        payload: {}
      });

      if (!gameResult.success) {
        throw new Error('Failed to start game engine');
      }

      // Initialize UI
      await this.routeMessage('orchestrator', 'ui-controller', {
        type: 'RENDER_FRAME',
        payload: { gameState: gameResult.gameState, forceRender: true }
      });

      // Start game loop if not skipped
      if (!skipLoop) {
        this.startGameLoop();
        this.isRunning = true;
      }

      this.logger.info('Game started successfully');

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to start game:', error);
      return { success: false, error: error.message };
    }
  }

  startGameLoop() {
    let lastTime = performance.now();

    const gameLoop = async (currentTime) => {
      if (!this.isRunning) return;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      try {
        // Update game engine
        const gameEngine = this.agents.get('game-engine');
        if (gameEngine) {
          await gameEngine.update(deltaTime);
        }

        // Get current game state
        const stateResult = await this.routeMessage('orchestrator', 'game-engine', {
          type: 'GET_GAME_STATE',
          payload: {}
        });

        if (stateResult.success) {
          // Update UI
          await this.routeMessage('orchestrator', 'ui-controller', {
            type: 'RENDER_FRAME',
            payload: { gameState: stateResult.gameState }
          });

          // Get AI suggestion if needed
          if (stateResult.gameState.currentPiece && Math.random() < 0.1) { // 10% chance
            this.getAISuggestion(stateResult.gameState);
          }
        }
      } catch (error) {
        this.logger.error('Game loop error:', error);
      }

      // Continue loop
      this.gameLoop = requestAnimationFrame(gameLoop);
    };

    this.gameLoop = requestAnimationFrame(gameLoop);
  }

  async getAISuggestion(gameState) {
    try {
      const prediction = await this.routeMessage('orchestrator', 'ai-predictor', {
        type: 'PREDICT_BEST_MOVE',
        payload: {
          piece: gameState.currentPiece,
          grid: gameState.grid,
          nextPieces: gameState.nextPieces
        }
      });

      if (prediction.success) {
        // Display AI suggestion in UI
        await this.routeMessage('orchestrator', 'ui-controller', {
          type: 'SHOW_AI_SUGGESTION',
          payload: { prediction: prediction.prediction }
        });
      }
    } catch (error) {
      this.logger.warn('Failed to get AI suggestion:', error);
    }
  }

  stopGame() {
    this.isRunning = false;

    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }

    this.logger.info('Game stopped');
  }

  isCircuitClosed(agentId) {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return true;

    if (breaker.state === 'OPEN') {
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        this.logger.info(`Circuit breaker for ${agentId} moved to HALF_OPEN`);
      } else {
        return false;
      }
    }

    return true;
  }

  recordSuccess(agentId) {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      breaker.failures = 0;
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        this.logger.info(`Circuit breaker for ${agentId} closed`);
      }
    }
  }

  recordFailure(agentId, error) {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= breaker.threshold) {
        breaker.state = 'OPEN';
        breaker.nextAttempt = Date.now() + breaker.timeout;
        this.logger.error(`Circuit breaker for ${agentId} opened after ${breaker.failures} failures`);
      }
    }
  }

  async handleRoutingFailure(fromAgent, toAgent, message, error) {
    // Implement graceful degradation strategies

    if (toAgent === 'ai-predictor') {
      // AI failures are non-critical, return empty prediction
      return {
        success: false,
        error: 'AI service unavailable',
        fallback: true
      };
    }

    if (toAgent === 'ui-controller') {
      // UI failures are serious but not game-breaking
      this.logger.error('UI Controller unavailable, game continues without rendering');
      return {
        success: false,
        error: 'UI service unavailable',
        fallback: true
      };
    }

    if (toAgent === 'game-engine') {
      // Game engine failures are critical
      this.logger.error('Game Engine unavailable, stopping game');
      this.stopGame();
      return {
        success: false,
        error: 'Game engine unavailable',
        critical: true
      };
    }

    return {
      success: false,
      error: error.message
    };
  }

  recordMetric(name, value, tags = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;

    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }

    const metrics = this.performanceMetrics.get(key);
    metrics.push({
      value,
      timestamp: Date.now()
    });

    // Keep only recent metrics
    if (metrics.length > 1000) {
      metrics.splice(0, 500);
    }
  }

  generateRoutingId() {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  async performHealthChecks() {
    const healthResults = {};

    for (const [agentId, agent] of this.agents) {
      try {
        const health = await agent.healthCheck();
        healthResults[agentId] = health;

        if (health.status !== 'healthy') {
          this.logger.warn(`Agent ${agentId} health check failed:`, health);
        }
      } catch (error) {
        healthResults[agentId] = {
          status: 'error',
          error: error.message
        };
        this.logger.error(`Health check failed for ${agentId}:`, error);
      }
    }

    // Log overall system health
    const unhealthyAgents = Object.entries(healthResults)
      .filter(([_, health]) => health.status !== 'healthy')
      .map(([agentId, _]) => agentId);

    if (unhealthyAgents.length > 0) {
      this.logger.warn(`Unhealthy agents detected: ${unhealthyAgents.join(', ')}`);
    }

    return healthResults;
  }

  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      agents: {},
      circuitBreakers: {},
      metrics: {}
    };

    // Agent health
    for (const [agentId, agent] of this.agents) {
      report.agents[agentId] = {
        status: 'unknown' // Would be filled by health check
      };
    }

    // Circuit breaker status
    for (const [agentId, breaker] of this.circuitBreakers) {
      report.circuitBreakers[agentId] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure
      };
    }

    // Performance metrics
    for (const [key, values] of this.performanceMetrics) {
      const recentValues = values.slice(-100).map(v => v.value);

      if (recentValues.length > 0) {
        report.metrics[key] = {
          count: recentValues.length,
          avg: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
          min: Math.min(...recentValues),
          max: Math.max(...recentValues),
          p95: this.percentile(recentValues, 0.95)
        };
      }
    }

    return report;
  }

  percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  async shutdown() {
    this.logger.info('Shutting down Tetris Orchestrator...');

    // Stop game loop
    this.stopGame();

    // Shutdown all agents
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.shutdown();
        this.logger.info(`Agent ${agentId} shut down successfully`);
      } catch (error) {
        this.logger.error(`Failed to shutdown agent ${agentId}:`, error);
      }
    }

    // Clear resources
    this.agents.clear();
    this.circuitBreakers.clear();
    this.performanceMetrics.clear();

    await super.shutdown();

    this.logger.info('Tetris Orchestrator shut down complete');
  }
}

export { TetrisOrchestrator };