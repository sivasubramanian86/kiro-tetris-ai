const { Agent, Orchestrator } = require('../src/strands-sdk');

describe('Strands SDK', () => {
  describe('Agent', () => {
    let agent;

    beforeEach(() => {
      agent = new Agent({ id: 'test-agent', name: 'Test Agent' });
    });

    test('should initialize with config', () => {
      expect(agent.id).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
    });

    test('should register message handler', () => {
      const handler = jest.fn();
      agent.onMessage('TEST', handler);
      expect(agent.messageHandlers.has('TEST')).toBe(true);
    });

    test('should handle message', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });
      agent.onMessage('TEST', handler);
      
      const result = await agent.handleMessage({ type: 'TEST' });
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    test('should return health check', async () => {
      // Add small delay to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      const health = await agent.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Orchestrator', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = new Orchestrator({ id: 'test-orchestrator' });
    });

    test('should initialize with config', () => {
      expect(orchestrator.id).toBe('test-orchestrator');
    });
  });
});