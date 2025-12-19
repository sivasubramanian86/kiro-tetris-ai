const { GameEngineAgent } = require('../../agents/game-engine-agent');

describe('GameEngineAgent', () => {
  let agent;

  beforeEach(async () => {
    agent = new GameEngineAgent();
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  test('should initialize successfully', () => {
    expect(agent.id).toBe('game-engine');
    expect(agent.capabilities).toContain('game-logic');
  });

  test('should handle start game message', async () => {
    const response = await agent.handleMessage({
      type: 'START_GAME',
      payload: {}
    });
    
    expect(response.success).toBe(true);
    expect(response.gameState).toBeDefined();
  });

  test('should handle move piece message', async () => {
    await agent.handleMessage({ type: 'START_GAME', payload: {} });
    
    const response = await agent.handleMessage({
      type: 'MOVE_PIECE',
      payload: { direction: 'left' }
    });
    
    expect(response.success).toBe(true);
  });

  test('should return health check', async () => {
    const health = await agent.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.uptime).toBeGreaterThan(0);
  });
});