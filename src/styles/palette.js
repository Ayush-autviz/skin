// palette.js
// Core color values with IDE color picking support

/* ------------------------------------------------------
WHAT IT DOES
- Defines raw color values
- Provides consistent color naming
- Enables IDE color picking via CSS comments

DEV PRINCIPLES
- Use descriptive color names
- Follow consistent naming pattern
- Keep all colors in one place
------------------------------------------------------*/

// Grayscale
const gray = {
  1: '#FFFFFF',
  2: '#F8F9FA',
  3: '#E9ECEF',
  4: '#D1D7DC',
  5: '#AEB7BF',
  6: '#868E96',
  7: '#495057',
  8: '#212529',
};

// Brand Colors
const brand = {
  blue: '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
};

// Status Colors
const status = {
  red: '#FF3B30',
  green: '#34C759',
  yellow: '#FFCC00',
  orange: '#FF9500',
};

// Additional Colors
const additional = {
  teal: '#5AC8FA',
  pink: '#FF2D55',
};

// Export as a single palette object
const palette = {
  gray1: gray[1],
  gray2: gray[2],
  gray3: gray[3],
  gray4: gray[4],
  gray5: gray[5],
  gray6: gray[6],
  gray7: gray[7],
  gray8: gray[8],
  ...brand,
  ...status,
  ...additional,
};

export default palette; 