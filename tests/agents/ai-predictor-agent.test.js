const { AIPredictorAgent } = require('../../agents/ai-predictor-agent');

describe('AIPredictorAgent', () => {
  let agent;

  beforeEach(async () => {
    agent = new AIPredictorAgent();
    await agent.initialize();
  });

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  test('should initialize successfully', () => {
    expect(agent.id).toBe('ai-predictor');
    expect(agent.capabilities).toContain('move-prediction');
  });

  test('should predict best move', async () => {
    const grid = Array(20).fill().map(() => Array(10).fill(0));
    const piece = { type: 'I', x: 4, y: 0, rotation: 0 };
    
    const response = await agent.handleMessage({
      type: 'PREDICT_BEST_MOVE',
      payload: { piece, grid }
    });
    
    expect(response.success).toBe(true);
    expect(response.prediction).toBeDefined();
    expect(response.prediction.move).toBeDefined();
    expect(response.prediction.confidence).toBeGreaterThanOrEqual(0);
  });

  test('should analyze board', async () => {
    const grid = Array(20).fill().map(() => Array(10).fill(0));
    
    const response = await agent.handleMessage({
      type: 'ANALYZE_BOARD',
      payload: { grid }
    });
    
    expect(response.success).toBe(true);
    expect(response.analysis).toBeDefined();
  });

  test('should set difficulty level', async () => {
    const response = await agent.handleMessage({
      type: 'SET_DIFFICULTY',
      payload: { level: 5 }
    });
    
    expect(response.success).toBe(true);
    expect(response.level).toBe(5);
  });
});