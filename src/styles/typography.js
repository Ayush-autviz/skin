// typography.js
// Typography styles and text components

/* ------------------------------------------------------
WHAT IT DOES
- Defines consistent text styles
- Maintains typography hierarchy
- Provides reusable text configurations

DEV PRINCIPLES
- Use limited set of font sizes
- Maintain consistent line heights
- Define clear hierarchy
------------------------------------------------------*/

export const fontFamily = {
  regular: 'Inter',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold'
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 48,
  },
  h2: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
}; 