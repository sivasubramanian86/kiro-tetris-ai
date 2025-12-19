# Game Engine Agent Specification

## EARS Format Requirements

**WHEN** the game starts  
**THE SYSTEM SHALL** initialize a 20x10 Tetris grid with empty cells

**WHEN** a new tetromino is spawned  
**THE SYSTEM SHALL** select from 7 standard pieces (I, O, T, S, Z, J, L) with random rotation

**WHEN** a tetromino moves down  
**THE SYSTEM SHALL** check collision with grid boundaries and placed blocks

**WHEN** a line is completed  
**THE SYSTEM SHALL** clear the line and drop all blocks above by one row

**WHEN** collision is detected at spawn position  
**THE SYSTEM SHALL** trigger game over state

## Agent Responsibilities

- Grid state management (20x10 matrix)
- Tetromino physics and collision detection
- Line clearing logic
- Score calculation (100 * lines * level)
- Level progression (every 10 lines)
- Game state transitions (playing, paused, game over)

## Interface Contract

```javascript
class GameEngineAgent {
  // State queries
  getGrid(): number[][]
  getCurrentPiece(): Tetromino
  getScore(): number
  getLevel(): number
  getGameState(): 'playing' | 'paused' | 'gameOver'
  
  // Actions
  movePiece(direction: 'left' | 'right' | 'down'): boolean
  rotatePiece(): boolean
  dropPiece(): void
  clearLines(): number
  spawnNewPiece(): void
}
```

## Performance Constraints

- Grid updates: <1ms
- Collision detection: <0.5ms
- Line clearing: <2ms
- Memory usage: <10MB for game state