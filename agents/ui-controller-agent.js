// Strands UI Controller Agent - Manages rendering and user interface
import { Agent } from '../src/strands-sdk.js';
import { Renderer } from '../src/renderer.js';

class UIControllerAgent extends Agent {
  constructor(config = {}) {
    super({
      id: 'ui-controller',
      name: 'Tetris UI Controller',
      capabilities: ['rendering', 'input-handling', 'theme-management', 'replay-ui'],
      ...config
    });
    
    this.renderer = null;
    this.currentTheme = 'win95';
    this.gameCanvas = null;
    this.uiCanvas = null;
    this.isRendering = false;
    this.frameCount = 0;
    this.fps = 0;
    this.lastFrameTime = 0;
    
    this.setupMessageHandlers();
  }

  async initialize() {
    await super.initialize();
    
    this.logger.info('UI Controller Agent initialized');
    
    // Register capabilities
    await this.registerCapabilities([
      'rendering',
      'input-handling',
      'theme-management',
      'replay-ui',
      'animation-system',
      'performance-monitoring'
    ]);
    
    // Initialize canvases and renderer
    await this.initializeRenderer();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  setupMessageHandlers() {
    // Rendering messages
    this.onMessage('RENDER_FRAME', this.handleRenderFrame.bind(this));
    this.onMessage('UPDATE_DISPLAY', this.handleUpdateDisplay.bind(this));
    
    // Theme management
    this.onMessage('SET_THEME', this.handleSetTheme.bind(this));
    this.onMessage('TOGGLE_THEME', this.handleToggleTheme.bind(this));
    
    // Input handling
    this.onMessage('HANDLE_INPUT', this.handleInput.bind(this));
    this.onMessage('REGISTER_INPUT_HANDLER', this.handleRegisterInputHandler.bind(this));
    
    // Animation system
    this.onMessage('ANIMATE_LINE_CLEAR', this.handleAnimateLineClear.bind(this));
    this.onMessage('ANIMATE_PIECE_DROP', this.handleAnimatePieceDrop.bind(this));
    
    // Replay UI
    this.onMessage('SHOW_REPLAY_CONTROLS', this.handleShowReplayControls.bind(this));
    this.onMessage('UPDATE_REPLAY_PROGRESS', this.handleUpdateReplayProgress.bind(this));
    
    // Game state updates
    this.onMessage('GAME_STATE_UPDATE', this.handleGameStateUpdate.bind(this));
    
    // UI state management
    this.onMessage('SHOW_DIALOG', this.handleShowDialog.bind(this));
    this.onMessage('HIDE_DIALOG', this.handleHideDialog.bind(this));
    this.onMessage('UPDATE_UI_ELEMENT', this.handleUpdateUIElement.bind(this));
  }

  async initializeRenderer() {
    try {
      // Get or create game canvas
      this.gameCanvas = document.getElementById('gameCanvas') || this.createCanvas('gameCanvas', 300, 600);
      
      // Get or create UI canvas
      this.uiCanvas = document.getElementById('uiCanvas') || this.createCanvas('uiCanvas', 200, 600);
      
      // Initialize renderer
      this.renderer = new Renderer(this.gameCanvas, this.currentTheme);
      
      // Setup input event listeners
      this.setupInputListeners();
      
      this.logger.info('Renderer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize renderer:', error);
      throw error;
    }
  }

  createCanvas(id, width, height) {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = width;
    canvas.height = height;
    canvas.style.border = '2px inset #c0c0c0';
    
    // Add to DOM
    const container = document.getElementById('gameContainer') || document.body;
    container.appendChild(canvas);
    
    return canvas;
  }

  setupInputListeners() {
    // Keyboard input
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardInput(event);
    });
    
    // Mouse input for UI elements
    document.addEventListener('click', (event) => {
      this.handleMouseInput(event);
    });
    
    // Touch input for mobile
    document.addEventListener('touchstart', (event) => {
      this.handleTouchInput(event);
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  async handleKeyboardInput(event) {
    const inputMessage = {
      type: 'INPUT_EVENT',
      payload: {
        inputType: 'keyboard',
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        timestamp: Date.now()
      }
    };
    
    // Send to game engine agent
    await this.sendMessage('game-engine', inputMessage);
    
    // Handle UI-specific shortcuts
    if (event.key === 'F1') {
      await this.handleToggleTheme();
      event.preventDefault();
    }
  }

  async handleMouseInput(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const inputMessage = {
      type: 'INPUT_EVENT',
      payload: {
        inputType: 'mouse',
        x,
        y,
        button: event.button,
        target: event.target.id,
        timestamp: Date.now()
      }
    };
    
    // Handle UI element clicks
    if (event.target.classList.contains('game-button')) {
      await this.handleButtonClick(event.target);
    }
  }

  async handleTouchInput(event) {
    // Convert touch to mouse-like input
    const touch = event.touches[0];
    if (touch) {
      const rect = touch.target.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const inputMessage = {
        type: 'INPUT_EVENT',
        payload: {
          inputType: 'touch',
          x,
          y,
          target: touch.target.id,
          timestamp: Date.now()
        }
      };
      
      await this.sendMessage('game-engine', inputMessage);
    }
  }

  async handleButtonClick(button) {
    const action = button.dataset.action;
    
    switch (action) {
      case 'pause':
        await this.sendMessage('game-engine', { type: 'PAUSE_GAME' });
        break;
      case 'restart':
        await this.sendMessage('game-engine', { type: 'RESTART_GAME' });
        break;
      case 'theme-toggle':
        await this.handleToggleTheme();
        break;
      default:
        this.logger.warn(`Unknown button action: ${action}`);
    }
  }

  async handleRenderFrame(message) {
    const startTime = performance.now();
    
    try {
      const { gameState, forceRender = false } = message.payload;
      
      if (!this.isRendering || forceRender) {
        this.isRendering = true;
        
        // Render game grid
        this.renderer.render(gameState);
        
        // Render UI panels
        this.renderer.renderUI(gameState, this.uiCanvas);
        
        // Update HTML UI elements
        this.updateHTMLElements(gameState);
        
        this.isRendering = false;
        this.frameCount++;
        
        const renderTime = performance.now() - startTime;
        this.recordMetric('render_time', renderTime);
        
        // Check performance
        if (renderTime > 16) {
          this.logger.warn(`Slow frame: ${renderTime.toFixed(2)}ms`);
        }
      }
      
      return { success: true, renderTime: performance.now() - startTime };
    } catch (error) {
      this.isRendering = false;
      this.logger.error('Failed to render frame:', error);
      return { success: false, error: error.message };
    }
  }

  updateHTMLElements(gameState) {
    // Update score display
    this.updateElement('score', gameState.score?.toLocaleString() || '0');
    this.updateElement('level', gameState.level?.toString() || '1');
    this.updateElement('lines', gameState.lines?.toString() || '0');
    
    // Update game state indicator
    this.updateElement('gameState', gameState.gameState || 'unknown');
    
    // Update next pieces display
    if (gameState.nextPieces) {
      this.updateNextPiecesDisplay(gameState.nextPieces);
    }
    
    // Update AI confidence if available
    if (gameState.aiConfidence !== undefined) {
      this.updateElement('aiConfidence', `${Math.round(gameState.aiConfidence * 100)}%`);
    }
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  updateNextPiecesDisplay(nextPieces) {
    const container = document.getElementById('nextPieces');
    if (!container) return;
    
    // Clear existing display
    container.innerHTML = '';
    
    // Render mini previews
    nextPieces.slice(0, 3).forEach((piece, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 60;
      canvas.className = 'next-piece-preview';
      
      this.renderMiniPiece(canvas, piece);
      container.appendChild(canvas);
    });
  }

  renderMiniPiece(canvas, piece) {
    const ctx = canvas.getContext('2d');
    const blockSize = 12;
    const colors = this.renderer.themes[this.currentTheme];
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (piece.shape) {
      piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const pixelX = x * blockSize + 10;
            const pixelY = y * blockSize + 10;
            
            ctx.fillStyle = colors.blockColors[piece.type] || colors.blockColors['I'];
            ctx.fillRect(pixelX, pixelY, blockSize, blockSize);
            
            ctx.strokeStyle = colors.blockBorder;
            ctx.strokeRect(pixelX, pixelY, blockSize, blockSize);
          }
        });
      });
    }
  }

  async handleSetTheme(message) {
    try {
      const { theme } = message.payload;
      
      if (!['win95', 'dark'].includes(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
      }
      
      this.currentTheme = theme;
      this.renderer.setTheme(theme);
      
      // Update body class for CSS theming
      document.body.className = `theme-${theme}`;
      
      // Update theme toggle button
      const themeButton = document.getElementById('themeToggle');
      if (themeButton) {
        themeButton.textContent = theme === 'win95' ? 'Dark Mode' : 'Win95 Mode';
      }
      
      this.logger.info(`Theme changed to: ${theme}`);
      
      return { success: true, theme: this.currentTheme };
    } catch (error) {
      this.logger.error('Failed to set theme:', error);
      return { success: false, error: error.message };
    }
  }

  async handleToggleTheme(message = {}) {
    const newTheme = this.currentTheme === 'win95' ? 'dark' : 'win95';
    return this.handleSetTheme({ payload: { theme: newTheme } });
  }

  async handleAnimateLineClear(message) {
    try {
      const { lines } = message.payload;
      
      this.renderer.animateLineClear(lines);
      
      // Play sound effect if available
      this.playSound('lineClear');
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to animate line clear:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAnimatePieceDrop(message) {
    try {
      const { piece } = message.payload;
      
      this.renderer.animatePieceDrop(piece);
      
      // Play sound effect
      this.playSound('pieceDrop');
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to animate piece drop:', error);
      return { success: false, error: error.message };
    }
  }

  playSound(soundType) {
    // Placeholder for sound system
    // In a full implementation, this would play appropriate sound effects
    try {
      const audio = document.getElementById(`sound-${soundType}`);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore audio play failures (user interaction required)
        });
      }
    } catch (error) {
      // Silently ignore sound errors
    }
  }

  async handleShowDialog(message) {
    try {
      const { dialogId, content, buttons = [] } = message.payload;
      
      const dialog = this.createDialog(dialogId, content, buttons);
      document.body.appendChild(dialog);
      
      // Apply theme styling
      dialog.className = `dialog theme-${this.currentTheme}`;
      
      return { success: true, dialogId };
    } catch (error) {
      this.logger.error('Failed to show dialog:', error);
      return { success: false, error: error.message };
    }
  }

  createDialog(id, content, buttons) {
    const dialog = document.createElement('div');
    dialog.id = id;
    dialog.className = 'dialog-overlay';
    
    const dialogBox = document.createElement('div');
    dialogBox.className = 'dialog-box';
    
    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'dialog-content';
    contentDiv.innerHTML = content;
    
    // Buttons
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'dialog-buttons';
    
    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.textContent = button.text;
      btn.className = 'dialog-button';
      btn.onclick = () => {
        if (button.action) button.action();
        this.hideDialog(id);
      };
      buttonDiv.appendChild(btn);
    });
    
    dialogBox.appendChild(contentDiv);
    dialogBox.appendChild(buttonDiv);
    dialog.appendChild(dialogBox);
    
    return dialog;
  }

  async handleHideDialog(message) {
    const { dialogId } = message.payload;
    this.hideDialog(dialogId);
    return { success: true };
  }

  hideDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
      dialog.remove();
    }
  }

  async handleGameStateUpdate(message) {
    const { eventType, gameState } = message.payload;
    
    // Handle specific game events
    switch (eventType) {
      case 'GAME_OVER':
        await this.showGameOverDialog(gameState);
        break;
      case 'LEVEL_UP':
        await this.showLevelUpNotification(gameState.level);
        break;
      case 'LINE_CLEAR':
        await this.handleAnimateLineClear({ payload: { lines: gameState.lastLinesCleared } });
        break;
    }
    
    // Always update display
    await this.handleRenderFrame({ payload: { gameState } });
  }

  async showGameOverDialog(gameState) {
    const content = `
      <h2>Game Over!</h2>
      <p>Final Score: ${gameState.score.toLocaleString()}</p>
      <p>Level Reached: ${gameState.level}</p>
      <p>Lines Cleared: ${gameState.lines}</p>
    `;
    
    const buttons = [
      {
        text: 'Play Again',
        action: () => this.sendMessage('game-engine', { type: 'RESTART_GAME' })
      },
      {
        text: 'View Replay',
        action: () => this.sendMessage('replay-system', { type: 'START_REPLAY' })
      }
    ];
    
    await this.handleShowDialog({
      payload: {
        dialogId: 'gameOverDialog',
        content,
        buttons
      }
    });
  }

  async showLevelUpNotification(level) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.textContent = `Level ${level}!`;
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ffff00;
      color: #000000;
      padding: 20px;
      border: 2px solid #000000;
      font-size: 24px;
      font-weight: bold;
      z-index: 9999;
      animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }

  handleResize() {
    // Adjust canvas sizes if needed
    if (this.gameCanvas && this.uiCanvas) {
      // Maintain aspect ratio
      const container = this.gameCanvas.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        const scale = Math.min(1, containerWidth / 500); // 500px total width
        
        this.gameCanvas.style.transform = `scale(${scale})`;
        this.uiCanvas.style.transform = `scale(${scale})`;
      }
    }
  }

  startPerformanceMonitoring() {
    setInterval(() => {
      this.fps = this.frameCount;
      this.frameCount = 0;
      
      // Update FPS display
      this.updateElement('fps', `${this.fps} FPS`);
      
      // Log performance warnings
      if (this.fps < 30) {
        this.logger.warn(`Low FPS detected: ${this.fps}`);
      }
    }, 1000);
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
    const metrics = this.getPerformanceMetrics();
    const issues = [];
    
    if (this.fps < 30) {
      issues.push('Low frame rate');
    }
    
    if (metrics.render_time?.avg > 16) {
      issues.push('High render latency');
    }
    
    if (!this.renderer) {
      issues.push('Renderer not initialized');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      metrics,
      fps: this.fps,
      theme: this.currentTheme,
      canvasInitialized: !!(this.gameCanvas && this.uiCanvas)
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

  async handleUpdateDisplay(message) {
    // Handle display updates
    const { displayType, data } = message.payload;
    
    switch (displayType) {
      case 'score':
        this.updateScoreDisplay(data);
        break;
      case 'level':
        this.updateLevelDisplay(data);
        break;
      case 'nextPiece':
        this.updateNextPieceDisplay(data);
        break;
      case 'holdPiece':
        this.updateHoldPieceDisplay(data);
        break;
      default:
        this.logger.warn(`Unknown display type: ${displayType}`);
    }
    
    return { success: true };
  }

  async handleInput(message) {
    // Handle user input
    const { inputType, data } = message.payload;
    
    switch (inputType) {
      case 'keyboard':
        await this.handleKeyboardInput(data);
        break;
      case 'mouse':
        await this.handleMouseInput(data);
        break;
      case 'touch':
        await this.handleTouchInput(data);
        break;
      default:
        this.logger.warn(`Unknown input type: ${inputType}`);
    }
    
    return { success: true };
  }

  async handleRegisterInputHandler(message) {
    // Register input handler
    const { handlerType, handler } = message.payload;
    
    // Store handler for later use
    if (!this.inputHandlers) {
      this.inputHandlers = new Map();
    }
    
    this.inputHandlers.set(handlerType, handler);
    
    return { success: true };
  }

  async handleShowReplayControls(message) {
    // Show replay controls UI
    const { show } = message.payload;
    
    if (show) {
      this.showReplayControls();
    } else {
      this.hideReplayControls();
    }
    
    return { success: true };
  }

  async handleUpdateReplayProgress(message) {
    // Update replay progress
    const { progress, currentFrame, totalFrames } = message.payload;
    
    this.updateReplayProgress(progress, currentFrame, totalFrames);
    
    return { success: true };
  }

  // Helper methods for display updates
  updateScoreDisplay(score) {
    // Stub implementation
    console.log(`Score: ${score}`);
  }

  updateLevelDisplay(level) {
    // Stub implementation
    console.log(`Level: ${level}`);
  }

  updateNextPieceDisplay(piece) {
    // Stub implementation
    console.log(`Next piece: ${piece}`);
  }

  updateHoldPieceDisplay(piece) {
    // Stub implementation
    console.log(`Hold piece: ${piece}`);
  }

  showReplayControls() {
    // Stub implementation
    console.log('Showing replay controls');
  }

  hideReplayControls() {
    // Stub implementation
    console.log('Hiding replay controls');
  }

  updateReplayProgress(progress, currentFrame, totalFrames) {
    // Stub implementation
    console.log(`Replay progress: ${progress}% (${currentFrame}/${totalFrames})`);
  }

  async handleUpdateUIElement(message) {
    // Update UI element
    const { elementId, property, value } = message.payload;
    
    // Stub implementation
    console.log(`Updating UI element ${elementId}: ${property} = ${value}`);
    
    return { success: true };
  }

  async shutdown() {
    this.logger.info('Shutting down UI Controller Agent');
    
    // Stop rendering
    this.isRendering = false;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyboardInput);
    document.removeEventListener('click', this.handleMouseInput);
    document.removeEventListener('touchstart', this.handleTouchInput);
    window.removeEventListener('resize', this.handleResize);
    
    await super.shutdown();
  }
}

export { UIControllerAgent };