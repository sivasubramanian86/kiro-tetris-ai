// Main entry point for KIRO Tetris AI
import { TetrisOrchestrator } from '../agents/orchestrator.js';
import { GameController } from './game-controller.js';

class TetrisApp {
  constructor() {
    this.orchestrator = null;
    this.gameController = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🎮 Initializing KIRO Tetris AI...');

      // Load environment configuration (only for server)
      if (typeof window === 'undefined') {
        await this.loadEnvironment();
      }

      // Initialize Strands orchestrator
      this.orchestrator = new TetrisOrchestrator({
        logLevel: (typeof window === 'undefined' ? process.env.LOG_LEVEL : 'info') || 'info'
      });

      await this.orchestrator.initialize();
      console.log('✅ Strands orchestrator initialized');

      // Initialize game controller if running in browser
      if (typeof window !== 'undefined') {
        await this.initializeBrowserGame();
      }

      // Initialize server if running in Node.js
      if (typeof window === 'undefined') {
        await this.initializeServer();
      }

      this.isInitialized = true;
      console.log('🚀 KIRO Tetris AI initialized successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize KIRO Tetris AI:', error);
      throw error;
    }
  }

  async loadEnvironment() {
    // Load environment variables based on cloud provider
    const provider = process.env.CLOUD_PROVIDER || 'aws';

    try {
      const dotenv = await import('dotenv');
      dotenv.default.config({ path: `.env.${provider}` });
      console.log(`📋 Loaded ${provider.toUpperCase()} configuration`);
    } catch (error) {
      console.warn(`⚠️  Could not load .env.${provider}, using system environment`);
    }

    // Validate required environment variables
    this.validateEnvironment();
  }

  validateEnvironment() {
    const required = [
      'NODE_ENV'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    }
  }

  async initializeBrowserGame() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Create game canvases
    const gameCanvas = this.createGameCanvas();
    const uiCanvas = this.createUICanvas();

    // Initialize game controller
    this.gameController = new GameController(gameCanvas, uiCanvas);

    // Connect to orchestrator
    await this.connectGameToOrchestrator();

    // Setup UI event handlers
    this.setupUIHandlers();

    console.log('🎮 Browser game initialized');
  }

  createGameCanvas() {
    let canvas = document.getElementById('gameCanvas');

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'gameCanvas';
      canvas.width = 300;
      canvas.height = 600;
      canvas.style.border = '2px inset #c0c0c0';

      const container = document.getElementById('gameContainer') || document.body;
      container.appendChild(canvas);
    }

    return canvas;
  }

  createUICanvas() {
    let canvas = document.getElementById('uiCanvas');

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'uiCanvas';
      canvas.width = 200;
      canvas.height = 600;
      canvas.style.border = '2px inset #c0c0c0';

      const container = document.getElementById('gameContainer') || document.body;
      container.appendChild(canvas);
    }

    return canvas;
  }

  async connectGameToOrchestrator() {
    // This would integrate the game controller with the Strands orchestrator
    // For now, we'll use a simplified connection

    this.gameController.onGameEvent = async (event) => {
      // Forward game events to orchestrator
      if (this.orchestrator) {
        await this.orchestrator.handleInputEvent({
          payload: event
        });
      }
    };
  }

  setupUIHandlers() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.gameController.toggleTheme();
      });
    }

    // Game controls
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.gameController.togglePause();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.gameController.restart();
      });
    }

    // Replay controls
    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        this.gameController.startReplay();
      });
    }

    const saveReplayBtn = document.getElementById('saveReplayBtn');
    if (saveReplayBtn) {
      saveReplayBtn.addEventListener('click', () => {
        this.gameController.saveReplay();
      });
    }

    // AI controls
    const aiHintBtn = document.getElementById('aiHintBtn');
    if (aiHintBtn) {
      aiHintBtn.addEventListener('click', async () => {
        await this.showAIHint();
      });
    }

    const aiToggleBtn = document.getElementById('aiToggleBtn');
    if (aiToggleBtn) {
      aiToggleBtn.addEventListener('click', () => {
        this.toggleAI();
      });
    }
  }

  async showAIHint() {
    try {
      const suggestion = await this.getAISuggestion();
      if (suggestion) {
        const dialog = document.getElementById('aiSuggestionDialog');
        const textEl = document.getElementById('aiSuggestionText');
        const confidenceEl = document.getElementById('aiSuggestionConfidence');

        if (textEl) textEl.textContent = suggestion.reasoning || 'AI suggests this move';
        if (confidenceEl) confidenceEl.textContent = `${Math.round(suggestion.confidence * 100)}%`;
        if (dialog) dialog.style.display = 'flex';
      }
    } catch (error) {
      console.error('Failed to get AI hint:', error);
      alert('AI hint is not available at the moment');
    }
  }

  toggleAI() {
    // Toggle AI assistance on/off
    if (this.gameController) {
      this.gameController.aiEnabled = !this.gameController.aiEnabled;
      const btn = document.getElementById('aiToggleBtn');
      if (btn) {
        btn.textContent = this.gameController.aiEnabled ? 'Disable AI' : 'Enable AI';
      }
      console.log(`AI ${this.gameController.aiEnabled ? 'enabled' : 'disabled'}`);
    }
  }

  async getAISuggestion() {
    if (this.gameController) {
      return await this.gameController.getAISuggestion();
    }
    return null;
  }

  async initializeServer() {
    // Dynamically import server-only modules
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    const helmet = (await import('helmet')).default;

    const app = express();
    const port = process.env.PORT || 3000;

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
    }));
    app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.static('public'));
    app.use('/src', express.static('src'));

    // API routes
    this.setupAPIRoutes(app);

    // Start server
    this.server = app.listen(port, () => {
      console.log(`🌐 Server running on port ${port}`);
      console.log('Server address:', this.server.address());
    });

    this.server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    this.server.on('listening', () => {
      console.log('Server is listening');
    });
  }

  setupAPIRoutes(app) {
    // Health check
    app.get('/api/health', async (req, res) => {
      try {
        const health = await this.orchestrator.performHealthChecks();
        res.json({
          status: 'healthy',
          timestamp: Date.now(),
          agents: health
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // Game state management
    app.post('/api/game/start', async (req, res) => {
      try {
        const result = await this.orchestrator.startGame();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.post('/api/game/move', async (req, res) => {
      try {
        const { direction } = req.body;
        const result = await this.orchestrator.routeMessage('api', 'game-engine', {
          type: 'MOVE_PIECE',
          payload: { direction }
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // AI predictions
    app.post('/api/ai/predict', async (req, res) => {
      try {
        const { piece, grid, nextPieces } = req.body;
        const result = await this.orchestrator.routeMessage('api', 'ai-predictor', {
          type: 'PREDICT_BEST_MOVE',
          payload: { piece, grid, nextPieces }
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Performance metrics
    app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = this.orchestrator.getPerformanceReport();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  async startGame() {
    if (!this.isInitialized) {
      throw new Error('App not initialized');
    }

    try {
      // Stop any existing orchestrator loop
      if (this.orchestrator) {
        this.orchestrator.stopGame();
      }

      await this.orchestrator.startGame({ skipLoop: typeof window !== 'undefined' });

      if (this.gameController) {
        this.gameController.start();
      }

      console.log('🎮 Game started!');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      throw error;
    }
  }

  async restart() {
    if (this.gameController) {
      // Hide dialog first
      const dialog = document.getElementById('gameOverDialog');
      if (dialog) dialog.style.display = 'none';

      this.gameController.restart();
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down KIRO Tetris AI...');

    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }

    console.log('✅ Shutdown complete');
  }
}

// Initialize app based on environment
async function main() {
  const app = new TetrisApp();

  try {
    await app.initialize();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await app.shutdown();
      process.exit(0);
    });

    // Auto-start game in browser
    if (typeof window !== 'undefined') {
      // Wait a bit for UI to be ready
      setTimeout(() => {
        app.startGame().catch(console.error);
      }, 1000);
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use as module or run directly
export { TetrisApp, main };

// Run if this is the main module (Node.js only)
if (typeof window === 'undefined') {
  (async () => {
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    if (process.argv[1] === __filename) {
      main().catch(console.error);
    }
  })();
}