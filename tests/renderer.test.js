const { Renderer } = require('../src/renderer');

// Mock canvas and context
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  imageSmoothingEnabled: false,
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  clearRect: jest.fn()
};

const mockCanvas = {
  width: 300,
  height: 600,
  getContext: jest.fn().mockReturnValue(mockContext)
};

describe('Renderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new Renderer(mockCanvas);
  });

  test('should initialize with canvas', () => {
    expect(renderer.canvas).toBe(mockCanvas);
    expect(renderer.theme).toBe('win95');
    expect(renderer.blockSize).toBe(30);
  });

  test('should set theme', () => {
    renderer.setTheme('dark');
    expect(renderer.theme).toBe('dark');
  });

  test('should clear canvas', () => {
    renderer.clearCanvas();
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  test('should render block', () => {
    renderer.renderBlock(0, 0, 'I');
    expect(mockContext.fillRect).toHaveBeenCalled();
  });
});