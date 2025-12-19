# Strands Patterns

## Multi-Agent Architecture Patterns

### Agent Registration Pattern
```javascript
// Centralized agent registry
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.capabilities = new Map();
  }
  
  register(agent, capabilities) {
    this.agents.set(agent.id, agent);
    capabilities.forEach(cap => {
      if (!this.capabilities.has(cap)) {
        this.capabilities.set(cap, new Set());
      }
      this.capabilities.get(cap).add(agent.id);
    });
  }
  
  findByCapability(capability) {
    return Array.from(this.capabilities.get(capability) || [])
      .map(id => this.agents.get(id));
  }
}
```

### Message Passing Pattern
```javascript
// Typed message system
class Message {
  constructor(type, payload, metadata = {}) {
    this.id = generateId();
    this.type = type;
    this.payload = payload;
    this.timestamp = Date.now();
    this.metadata = metadata;
  }
}

// Message routing with middleware
class MessageBus {
  constructor() {
    this.middleware = [];
    this.handlers = new Map();
  }
  
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  async send(message) {
    // Apply middleware pipeline
    for (const mw of this.middleware) {
      message = await mw(message);
    }
    
    const handler = this.handlers.get(message.type);
    return handler ? await handler(message) : null;
  }
}
```

### Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### Event Sourcing Pattern
```javascript
// Game events for replay system
class GameEventStore {
  constructor() {
    this.events = [];
    this.snapshots = new Map();
  }
  
  append(event) {
    event.sequence = this.events.length;
    this.events.push(event);
    this.notifySubscribers(event);
  }
  
  replay(fromSequence = 0) {
    return this.events.slice(fromSequence);
  }
  
  createSnapshot(sequence, state) {
    this.snapshots.set(sequence, state);
  }
  
  getStateAt(sequence) {
    // Find nearest snapshot
    const snapshotSeq = Math.max(...Array.from(this.snapshots.keys())
      .filter(seq => seq <= sequence));
    
    let state = this.snapshots.get(snapshotSeq) || this.getInitialState();
    
    // Replay events from snapshot
    const events = this.events.slice(snapshotSeq, sequence + 1);
    return events.reduce((state, event) => this.applyEvent(state, event), state);
  }
}
```

### Saga Pattern for Complex Workflows
```javascript
// Multi-step game operations
class GameSaga {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.steps = [];
    this.compensations = [];
  }
  
  addStep(step, compensation) {
    this.steps.push(step);
    this.compensations.unshift(compensation); // Reverse order
  }
  
  async execute() {
    const results = [];
    let stepIndex = 0;
    
    try {
      for (const step of this.steps) {
        const result = await step();
        results.push(result);
        stepIndex++;
      }
      return results;
    } catch (error) {
      // Compensate completed steps
      for (let i = 0; i < stepIndex; i++) {
        try {
          await this.compensations[i](results[i]);
        } catch (compError) {
          console.error('Compensation failed:', compError);
        }
      }
      throw error;
    }
  }
}
```

### Agent Lifecycle Management
```javascript
class AgentLifecycleManager {
  constructor() {
    this.agents = new Map();
    this.healthChecks = new Map();
  }
  
  async startAgent(agentClass, config) {
    const agent = new agentClass(config);
    
    // Initialize agent
    await agent.initialize();
    
    // Register health check
    this.healthChecks.set(agent.id, {
      agent,
      lastCheck: Date.now(),
      status: 'healthy'
    });
    
    // Start monitoring
    this.startHealthMonitoring(agent);
    
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.shutdown();
      this.agents.delete(agentId);
      this.healthChecks.delete(agentId);
    }
  }
  
  startHealthMonitoring(agent) {
    const interval = setInterval(async () => {
      try {
        const health = await agent.healthCheck();
        this.updateHealthStatus(agent.id, health);
      } catch (error) {
        this.handleUnhealthyAgent(agent.id, error);
      }
    }, 30000); // 30 second intervals
    
    agent.on('shutdown', () => clearInterval(interval));
  }
}
```

### Load Balancing Pattern
```javascript
class LoadBalancer {
  constructor(strategy = 'round-robin') {
    this.strategy = strategy;
    this.counters = new Map();
  }
  
  select(agents) {
    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(agents);
      case 'least-connections':
        return this.leastConnections(agents);
      case 'weighted':
        return this.weighted(agents);
      default:
        return agents[0];
    }
  }
  
  roundRobin(agents) {
    const key = agents.map(a => a.id).join(',');
    const counter = this.counters.get(key) || 0;
    this.counters.set(key, (counter + 1) % agents.length);
    return agents[counter];
  }
  
  leastConnections(agents) {
    return agents.reduce((min, agent) => 
      agent.activeConnections < min.activeConnections ? agent : min
    );
  }
}
```