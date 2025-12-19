# Performance Constraints

## Real-Time Gaming Requirements

### Frame Rate Targets
- **60 FPS**: Smooth gameplay (16.67ms per frame)
- **30 FPS**: Minimum acceptable (33.33ms per frame)
- **Frame drops**: <1% of frames can be dropped
- **Input lag**: <50ms from input to visual response

### Agent Response Times
```javascript
const PERFORMANCE_THRESHOLDS = {
  gameEngine: {
    collision: 0.5,      // Collision detection
    lineClearing: 2.0,   // Line clear operation
    stateUpdate: 1.0     // Game state update
  },
  aiPredictor: {
    moveAnalysis: 100,   // Single move analysis
    boardEval: 50,       // Board evaluation
    lookahead: 200       // 3-move lookahead
  },
  uiController: {
    render: 16,          // Frame rendering
    themeSwitch: 100,    // Theme toggle
    inputHandle: 5       // Input processing
  }
};
```

### Memory Constraints
- **Total heap**: <100MB for entire application
- **Game state**: <10MB maximum
- **AI search trees**: <50MB maximum
- **UI buffers**: <20MB for rendering
- **Garbage collection**: <5ms pause times

## Cloud Function Limits

### AWS Lambda
```javascript
const AWS_LIMITS = {
  memory: 3008,        // MB maximum
  timeout: 900,        // seconds
  coldStart: 500,      // ms target
  concurrency: 1000    // concurrent executions
};
```

### Google Cloud Functions
```javascript
const GCP_LIMITS = {
  memory: 8192,        // MB maximum
  timeout: 540,        // seconds
  coldStart: 400,      // ms target
  concurrency: 3000    // concurrent executions
};
```

### Vercel Edge Functions
```javascript
const VERCEL_LIMITS = {
  memory: 128,         // MB maximum
  timeout: 30,         // seconds
  coldStart: 100,      // ms target
  regions: 'global'    // edge deployment
};
```

## Database Performance

### Query Optimization
```javascript
// DynamoDB query patterns
const QUERY_PATTERNS = {
  getGameState: {
    maxLatency: 50,    // ms
    throughput: 1000   // RCU
  },
  saveScore: {
    maxLatency: 100,   // ms
    throughput: 500    // WCU
  },
  leaderboard: {
    maxLatency: 200,   // ms
    caching: 300       // seconds TTL
  }
};
```

### Caching Strategy
- **Game state**: In-memory during play
- **Leaderboard**: 5-minute cache
- **AI models**: Persistent cache
- **Static assets**: CDN with 1-day TTL

## Network Performance

### API Response Times
```javascript
const API_TARGETS = {
  gameActions: 50,     // ms - critical path
  aiPredictions: 100,  // ms - can be async
  leaderboard: 200,    // ms - non-critical
  replay: 500          // ms - background
};
```

### Bandwidth Optimization
- **WebSocket**: Game state updates (minimal payload)
- **REST API**: Configuration and scores
- **CDN**: Static assets and replays
- **Compression**: Gzip for all text content

## Monitoring and Alerting

### Performance Metrics
```javascript
class PerformanceMonitor {
  trackMetric(name, value, threshold) {
    this.metrics.record(name, value);
    
    if (value > threshold) {
      this.alerting.warn(`${name} exceeded threshold: ${value}ms > ${threshold}ms`);
    }
  }
  
  generateReport() {
    return {
      p50: this.metrics.percentile(50),
      p95: this.metrics.percentile(95),
      p99: this.metrics.percentile(99),
      errors: this.metrics.errorRate()
    };
  }
}
```

### SLA Targets
- **Availability**: 99.9% uptime
- **Response time**: 95th percentile < 200ms
- **Error rate**: <0.1% of requests
- **Recovery time**: <5 minutes for incidents