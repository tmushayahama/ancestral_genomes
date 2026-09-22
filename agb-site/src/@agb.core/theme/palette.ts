/**
 * Carried over from the Angular app's SCSS theme (`@noctua/scss/theming.scss`):
 * primary was `$mat-noctuadark`, accent was Material light-blue. Keeping the
 * same ramps means the React site is visually continuous with both the old AGB
 * site and its sibling Noctua apps.
 */
export const agbColors = {
  primary: {
    50: '#e4e7ec',
    100: '#bbc3d0',
    200: '#8e9bb0',
    300: '#627491',
    400: '#3f567b',
    500: '#173672',
    600: '#132f64',
    700: '#102653',
    800: '#0c1d42',
    900: '#08142f',
  },
  accent: {
    50: '#e1f5fe',
    100: '#b3e5fc',
    200: '#81d4fa',
    300: '#4fc3f7',
    400: '#29b6f6',
    500: '#03a9f4',
    600: '#039be5',
    700: '#0288d1',
    800: '#0277bd',
    900: '#01579b',
  },
} as const
