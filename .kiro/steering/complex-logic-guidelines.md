# Complex Logic Guidelines

## Tetris Game Logic Complexity

### Collision Detection Algorithm
```javascript
// Optimized collision detection with early exit
function checkCollision(piece, position, grid) {
  const { x, y } = position;
  const shape = piece.getShape();
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue; // Empty cell, skip
      
      const newX = x + col;
      const newY = y + row;
      
      // Boundary checks (early exit)
      if (newX < 0 || newX >= 10 || newY >= 20) return true;
      if (newY < 0) continue; // Above grid is OK
      
      // Grid collision
      if (grid[newY][newX] !== 0) return true;
    }
  }
  return false;
}
```

### AI Heuristic Scoring
```javascript
// Multi-factor board evaluation
function evaluateBoard(grid) {
  const weights = {
    height: -0.510066,
    lines: 0.760666,
    holes: -0.35663,
    bumpiness: -0.184483
  };
  
  return (
    weights.height * getAggregateHeight(grid) +
    weights.lines * getCompleteLines(grid) +
    weights.holes * getHoles(grid) +
    weights.bumpiness * getBumpiness(grid)
  );
}
```

### Line Clearing Optimization
```javascript
// Efficient line clearing with minimal array operations
function clearLines(grid) {
  let linesCleared = 0;
  let writeIndex = 19; // Start from bottom
  
  // Scan from bottom to top
  for (let readIndex = 19; readIndex >= 0; readIndex--) {
    if (!isLineFull(grid[readIndex])) {
      if (writeIndex !== readIndex) {
        grid[writeIndex] = [...grid[readIndex]];
      }
      writeIndex--;
    } else {
      linesCleared++;
    }
  }
  
  // Fill top with empty lines
  for (let i = 0; i <= writeIndex; i++) {
    grid[i] = new Array(10).fill(0);
  }
  
  return linesCleared;
}
```

## Agent Coordination Complexity

### Strands Message Routing
```javascript
// Intelligent message routing with load balancing
class MessageRouter {
  async routeMessage(message) {
    const targetAgent = this.selectAgent(message.type);
    
    if (targetAgent.isOverloaded()) {
      return this.handleBackpressure(message);
    }
    
    return this.deliverWithTimeout(targetAgent, message, 100);
  }
  
  selectAgent(messageType) {
    const candidates = this.agentRegistry.getByCapability(messageType);
    return this.loadBalancer.selectLeastLoaded(candidates);
  }
}
```

### State Synchronization
```javascript
// Eventually consistent state management
class GameStateManager {
  async syncState(updates) {
    const version = this.incrementVersion();
    
    // Optimistic update
    this.applyUpdates(updates, version);
    
    // Broadcast to agents
    const promises = this.agents.map(agent => 
      agent.updateState(updates, version).catch(this.handleSyncError)
    );
    
    await Promise.allSettled(promises);
    return version;
  }
}
```

## Performance Optimization Guidelines

### Memory Management
- Object pooling for tetrominoes
- Grid state immutability with structural sharing
- Garbage collection optimization
- Memory leak prevention

### CPU Optimization
- Bitwise operations for grid manipulation
- Lookup tables for rotation matrices
- Memoization for expensive calculations
- Web Workers for AI computation

### Rendering Optimization
- Canvas dirty region tracking
- RequestAnimationFrame scheduling
- Sprite batching
- Offscreen canvas pre-rendering