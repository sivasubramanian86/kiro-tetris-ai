# Test Generation Hook

## Purpose
Automatically generate comprehensive test suites for all agents and game components.

## Trigger Conditions
- New agent implementation
- Game logic changes
- API endpoint modifications
- Security requirement updates

## Test Generation Rules

### Unit Tests
```javascript
// Auto-generate for each agent method
describe('GameEngineAgent', () => {
  test('should initialize 20x10 grid', () => {
    const agent = new GameEngineAgent();
    const grid = agent.getGrid();
    expect(grid).toHaveLength(20);
    expect(grid[0]).toHaveLength(10);
  });
});
```

### Integration Tests
- Agent communication patterns
- Strands orchestrator handoffs
- Multi-cloud adapter functionality
- Security guardrail validation

### E2E Tests
- Complete game playthrough
- AI prediction accuracy
- Theme switching
- Replay system functionality

## Coverage Requirements
- **Minimum**: 85% code coverage
- **Critical Paths**: 100% coverage (game logic, security)
- **Performance Tests**: All agents under load
- **Security Tests**: Input validation, secret handling

## Test Data Generation
- Random tetromino sequences
- Edge case board states
- Performance stress scenarios
- Security attack vectors

## Automation
- Run on every commit
- Generate missing tests for new code
- Update tests when specs change
- Performance regression detection