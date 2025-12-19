# Win95 UI Standards

## Authentic Windows 95 Design Language

### Color Palette
```css
:root {
  --win95-gray: #c0c0c0;
  --win95-dark-gray: #808080;
  --win95-light-gray: #dfdfdf;
  --win95-blue: #0000ff;
  --win95-white: #ffffff;
  --win95-black: #000000;
  --win95-red: #ff0000;
  --win95-green: #008000;
  --win95-yellow: #ffff00;
}
```

### Typography
```css
.win95-font {
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
  font-weight: normal;
  color: var(--win95-black);
}

.win95-title {
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
  font-weight: bold;
  color: var(--win95-white);
  background: var(--win95-blue);
}
```

### Window Chrome
```css
.win95-window {
  border: 2px outset var(--win95-gray);
  background: var(--win95-gray);
  box-shadow: 1px 1px 0px var(--win95-dark-gray);
}

.win95-titlebar {
  background: linear-gradient(90deg, var(--win95-blue) 0%, var(--win95-blue) 100%);
  color: var(--win95-white);
  height: 18px;
  padding: 2px 4px;
  font-weight: bold;
}

.win95-button {
  border: 1px outset var(--win95-gray);
  background: var(--win95-gray);
  padding: 2px 8px;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
}

.win95-button:active {
  border: 1px inset var(--win95-gray);
}
```

### Game UI Components

#### Tetris Grid
```css
.tetris-grid {
  border: 2px inset var(--win95-gray);
  background: var(--win95-black);
  width: 300px;
  height: 600px;
}

.tetris-block {
  width: 30px;
  height: 30px;
  border: 1px outset;
}
```

#### Score Panel
```css
.score-panel {
  border: 2px inset var(--win95-gray);
  background: var(--win95-gray);
  padding: 8px;
  margin: 4px;
}

.score-label {
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 2px;
}

.score-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  background: var(--win95-white);
  border: 1px inset var(--win95-gray);
  padding: 2px 4px;
}
```

#### Next Piece Preview
```css
.next-piece {
  border: 2px inset var(--win95-gray);
  background: var(--win95-black);
  width: 120px;
  height: 80px;
  margin: 4px;
}
```

### Tetromino Colors (Win95 Style)
```javascript
const TETROMINO_COLORS = {
  I: '#00ffff', // Cyan
  O: '#ffff00', // Yellow
  T: '#800080', // Purple
  S: '#00ff00', // Green
  Z: '#ff0000', // Red
  J: '#0000ff', // Blue
  L: '#ffa500'  // Orange
};
```

### Menu System
```css
.win95-menubar {
  background: var(--win95-gray);
  border-bottom: 1px solid var(--win95-dark-gray);
  height: 20px;
}

.win95-menu-item {
  padding: 2px 8px;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
}

.win95-menu-item:hover {
  background: var(--win95-blue);
  color: var(--win95-white);
}
```

### Dialog Boxes
```css
.win95-dialog {
  border: 2px outset var(--win95-gray);
  background: var(--win95-gray);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 200px;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.win95-dialog-content {
  padding: 12px;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
}

.win95-dialog-buttons {
  text-align: right;
  padding: 8px 12px;
  border-top: 1px solid var(--win95-dark-gray);
}
```

## Dark Mode Adaptation

### Dark Theme Palette
```css
:root[data-theme="dark"] {
  --win95-gray: #2d2d30;
  --win95-dark-gray: #1e1e1e;
  --win95-light-gray: #3e3e42;
  --win95-blue: #0078d4;
  --win95-white: #ffffff;
  --win95-black: #1e1e1e;
}
```

### Theme Toggle Animation
```css
.theme-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Accessibility Compliance

### Keyboard Navigation
- Tab order follows visual layout
- Enter/Space activates buttons
- Arrow keys navigate menus
- Escape closes dialogs

### Screen Reader Support
```html
<div role="application" aria-label="Tetris Game">
  <div role="grid" aria-label="Game Board">
    <div role="gridcell" aria-label="Empty cell"></div>
  </div>
</div>
```

### High Contrast Mode
```css
@media (prefers-contrast: high) {
  .tetris-block {
    border-width: 2px;
    border-style: solid;
  }
}
```