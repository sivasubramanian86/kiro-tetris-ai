// Main game controller with input handling and game loop
import { GameEngine } from './game-engine.js';
import { Renderer } from './renderer.js';
import { ReplaySystem } from './replay-system.js';

class GameController {
  constructor(gameCanvas, uiCanvas) {
    this.gameEngine = new GameEngine();
    this.renderer = new Renderer(gameCanvas);
    this.uiCanvas = uiCanvas;

    this.inputHandler = new InputHandler();
    this.replaySystem = new ReplaySystem();

    this.isRunning = false;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;

    this.setupEventListeners();
    this.setupGameLoop();
  }

  setupEventListeners() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      this.handleKeyPress(e.key);
    });
  }

  handleKeyPress(key) {
    if (this.gameEngine.gameState !== 'playing') return;

    const action = this.inputHandler.mapKeyToAction(key);
    if (!action) return;

    // Record input for replay
    this.replaySystem.recordInput(action, Date.now());

    // Execute action
    switch (action.type) {
      case 'move':
        this.gameEngine.movePiece(action.direction);
        break;
      case 'rotate':
        this.gameEngine.rotatePiece();
        break;
      case 'drop':
        this.hardDrop();
        break;
      case 'pause':
        this.togglePause();
        break;
    }
  }

  hardDrop() {
    let dropDistance = 0;
    while (this.gameEngine.movePiece('down')) {
      dropDistance++;
    }

    // Bonus points for hard drop
    this.gameEngine.score += dropDistance * 2;

    // Animate drop
    this.renderer.animatePieceDrop(this.gameEngine.currentPiece);
  }

  toggleTheme() {
    const currentTheme = this.renderer.theme;
    const newTheme = currentTheme === 'win95' ? 'dark' : 'win95';
    this.renderer.setTheme(newTheme);

    // Update UI theme
    document.body.classList.remove(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${newTheme}`);

    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = newTheme === 'win95' ? 'Dark Mode' : 'Win95 Mode';
    }
  }

  togglePause() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (this.gameEngine.gameState === 'playing') {
      this.gameEngine.gameState = 'paused';
      this.isRunning = false;
      if (pauseBtn) pauseBtn.textContent = 'Resume';
      this.render(); // Ensure paused state is rendered (showing overlay)
    } else if (this.gameEngine.gameState === 'paused') {
      this.gameEngine.gameState = 'playing';
      this.isRunning = true;
      if (pauseBtn) pauseBtn.textContent = 'Pause';
      this.gameLoop();
    }
  }

  restart() {
    this.gameEngine = new GameEngine();
    this.replaySystem.reset();
    this.start();
  }

  start() {
    this.gameEngine.spawnNewPiece();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  setupGameLoop() {
    // Performance monitoring
    setInterval(() => {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.updatePerformanceDisplay();
    }, 1000);
  }

  gameLoop(currentTime = performance.now()) {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.frameCount++;

    // Update game logic
    this.update(deltaTime);

    // Render frame
    this.render();

    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    // Update game engine
    this.gameEngine.update(deltaTime);

    // Record game state for replay
    this.replaySystem.recordState(this.gameEngine.getState(), Date.now());

    // Check for game over
    if (this.gameEngine.gameState === 'gameOver') {
      this.handleGameOver();
    }
  }

  render() {
    const gameState = this.gameEngine.getState();

    // Render game grid
    this.renderer.render(gameState);

    // Render UI panels
    this.renderer.renderUI(gameState, this.uiCanvas);

    // Update HTML UI elements
    this.updateUIElements(gameState);
  }

  updateUIElements(gameState) {
    // Update score display
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = gameState.score.toLocaleString();
    }

    // Update level display
    const levelElement = document.getElementById('level');
    if (levelElement) {
      levelElement.textContent = gameState.level;
    }

    // Update lines display
    const linesElement = document.getElementById('lines');
    if (linesElement) {
      linesElement.textContent = gameState.lines;
    }

    // Update game state display
    const stateElement = document.getElementById('gameState');
    if (stateElement) {
      stateElement.textContent = gameState.gameState;
    }
  }

  updatePerformanceDisplay() {
    const fpsElement = document.getElementById('fps');
    if (fpsElement) {
      fpsElement.textContent = `${this.fps} FPS`;
    }
  }

  handleGameOver() {
    this.isRunning = false;

    // Save high score
    this.saveHighScore();

    // Show game over dialog
    this.showGameOverDialog();

    // Finalize replay
    this.replaySystem.finalize();
  }

  saveHighScore() {
    const currentScore = this.gameEngine.score;
    const highScores = this.getHighScores();

    highScores.push({
      score: currentScore,
      level: this.gameEngine.level,
      lines: this.gameEngine.lines,
      date: new Date().toISOString(),
      replay: this.replaySystem.getReplayData()
    });

    // Sort and keep top 10
    highScores.sort((a, b) => b.score - a.score);
    const topScores = highScores.slice(0, 10);

    localStorage.setItem('tetris-highscores', JSON.stringify(topScores));
  }

  getHighScores() {
    try {
      return JSON.parse(localStorage.getItem('tetris-highscores') || '[]');
    } catch {
      return [];
    }
  }

  showGameOverDialog() {
    const dialog = document.getElementById('gameOverDialog');
    if (dialog) {
      const finalScore = document.getElementById('finalScore');
      if (finalScore) {
        finalScore.textContent = this.gameEngine.score.toLocaleString();
      }

      dialog.style.display = 'block';
    }
  }

  startReplay() {
    if (!this.replaySystem.hasReplay()) return;

    this.isRunning = false;
    this.gameEngine.gameState = 'replay';

    // Start replay playback
    this.replaySystem.startPlayback((state) => {
      this.renderer.render(state);
    });
  }

  saveReplay() {
    // Save current game as a replay
    const replayId = `replay_${Date.now()}`;
    const replayData = this.replaySystem.getReplayData();

    // In a real app, this would send to server
    console.log(`Replay saved: ${replayId}`, replayData);
    alert('Replay saved successfully!');
  }

  // AI Integration methods
  async getAISuggestion() {
    if (!this.gameEngine.currentPiece) return null;

    try {
      const aiAgent = this.getAIAgent();
      const suggestion = await aiAgent.predictBestMove(
        this.gameEngine.currentPiece,
        this.gameEngine.grid
      );

      return suggestion;
    } catch (error) {
      console.warn('AI suggestion failed:', error);
      return null;
    }
  }

  getAIAgent() {
    return {
      predictBestMove: async (piece, grid) => {
        // Mock AI response
        return {
          x: 4,
          y: 0,
          rotation: 0,
          confidence: 0.85,
          reasoning: 'The AI recommends placing this piece in the center to maintain structural integrity and maximize future clearing potential.'
        };
      }
    };
  }
}

class InputHandler {
  constructor() {
    this.keyMappings = {
      'ArrowLeft': { type: 'move', direction: 'left' },
      'ArrowRight': { type: 'move', direction: 'right' },
      'ArrowDown': { type: 'move', direction: 'down' },
      'ArrowUp': { type: 'rotate' },
      ' ': { type: 'drop' },
      'Escape': { type: 'pause' },
      'p': { type: 'pause' },
      'P': { type: 'pause' }
    };

    this.lastInputTime = 0;
    this.inputDelay = 50; // ms between inputs
  }

  mapKeyToAction(key) {
    const now = Date.now();
    if (now - this.lastInputTime < this.inputDelay) {
      return null; // Debounce rapid inputs
    }

    this.lastInputTime = now;
    return this.keyMappings[key] || null;
  }

  setKeyMapping(key, action) {
    this.keyMappings[key] = action;
  }
}

export { GameController, InputHandler };