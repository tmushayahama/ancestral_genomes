import {
  createTheme,
  ActionIcon,
  Button,
  Checkbox,
  Menu,
  Modal,
  Select,
  Textarea,
  TextInput,
  Tooltip,
  type MantineColorsTuple,
} from '@mantine/core'
import { agbColors } from './palette'

const toTuple = (ramp: Record<number, string>): MantineColorsTuple =>
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
    hue => ramp[hue]
  ) as unknown as MantineColorsTuple

export const mantineTheme = createTheme({
  primaryColor: 'primary',
  primaryShade: 5,
  colors: {
    primary: toTuple(agbColors.primary),
    accent: toTuple(agbColors.accent),
  },
  defaultRadius: 'sm',
  fontFamily:
    'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Oxygen, Ubuntu, Cantarell, sans-serif',
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  headings: {
    fontWeight: '500',
  },
  components: {
    Button: Button.extend({
      defaultProps: { size: 'xs' },
      styles: { root: { textTransform: 'none' } },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: 'subtle', color: 'gray' },
    }),
    TextInput: TextInput.extend({ defaultProps: { size: 'xs' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'xs' } }),
    Select: Select.extend({
      defaultProps: {
        size: 'xs',
        allowDeselect: false,
        comboboxProps: { withinPortal: true },
      },
    }),
    Checkbox: Checkbox.extend({ defaultProps: { size: 'sm' } }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        withArrow: true,
        openDelay: 200,
        multiline: true,
        transitionProps: { transition: 'fade', duration: 150 },
      },
      styles: { tooltip: { maxWidth: 420, whiteSpace: 'normal' } },
    }),
    Menu: Menu.extend({
      styles: {
        dropdown: {
          backgroundColor: agbColors.primary[100],
          color: agbColors.primary[900],
        },
        item: { color: agbColors.primary[900] },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        withCloseButton: false,
        padding: 0,
        radius: 'md',
        overlayProps: { backgroundOpacity: 0.4, blur: 1 },
        transitionProps: { transition: 'pop', duration: 150 },
      },
    }),
  },
})
