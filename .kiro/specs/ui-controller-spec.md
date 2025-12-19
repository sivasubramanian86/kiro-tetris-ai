# UI Controller Agent Specification

## EARS Format Requirements

**WHEN** the game state updates  
**THE SYSTEM SHALL** render the grid within 16ms (60 FPS)

**WHEN** user toggles theme  
**THE SYSTEM SHALL** switch between Win95 and dark mode instantly

**WHEN** replay mode is activated  
**THE SYSTEM SHALL** display move annotations and AI confidence scores

**WHEN** game is paused  
**THE SYSTEM SHALL** show pause overlay with game statistics

## Agent Responsibilities

- Canvas rendering with 60 FPS performance
- Win95 retro theme with authentic styling
- Dark mode theme toggle
- Replay system UI with timeline scrubbing
- Input handling and event delegation
- Animation system for piece drops and line clears

## UI Components

- **Game Grid**: 20x10 canvas with block rendering
- **Next Piece Preview**: Shows upcoming 3 pieces
- **Score Panel**: Score, level, lines, AI confidence
- **Theme Toggle**: Win95 ↔ Dark mode switcher
- **Replay Controls**: Play, pause, scrub, speed control

## Interface Contract

```javascript
class UIControllerAgent {
  // Rendering
  renderGrid(grid: number[][]): void
  renderPiece(piece: Tetromino, position: Position): void
  renderUI(gameState: GameState): void
  
  // Themes
  setTheme(theme: 'win95' | 'dark'): void
  toggleTheme(): void
  
  // Replay
  renderReplayControls(): void
  showMoveAnnotation(move: Move, confidence: number): void
  
  // Input
  handleKeyPress(key: string): void
  handleMouseClick(x: number, y: number): void
}
```

## Performance Constraints

- Frame rate: 60 FPS (16ms per frame)
- Theme switching: <100ms
- Canvas updates: <5ms
- Memory usage: <20MB for UI state