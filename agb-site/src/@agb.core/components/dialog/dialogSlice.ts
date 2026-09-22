import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

/**
 * Replaces the Angular `GenesDialogService` / `SpeciesDialogService`
 * (`MatDialog.open(Component, { data })`). One slice holds which dialog is
 * open and its props; `GlobalDialog` maps the enum to a component so features
 * can open a dialog without importing it.
 */
export enum DialogComponent {
  GENE_DETAIL = 'GeneDetail',
  SPECIES_DETAIL = 'SpeciesDetail',
}

export interface DialogState {
  open: boolean
  title: string
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showActions: boolean
  confirmLabel: string
  cancelLabel: string
  preventBackdropClose: boolean
  /** 'auto' wraps the body in overflow-y-auto; 'none' lets the child scroll. */
  bodyScroll: 'auto' | 'none'
  component: DialogComponent | null
  customProps: Record<string, unknown>
}

const initialState: DialogState = {
  open: false,
  title: '',
  size: 'lg',
  showActions: false,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  preventBackdropClose: false,
  bodyScroll: 'auto',
  component: null,
  customProps: {},
}

export const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    openDialog: (
      state,
      action: PayloadAction<Partial<DialogState> & { component: DialogComponent }>
    ) => ({ ...initialState, ...state, open: true, ...action.payload }),
    closeDialog: state => {
      state.open = false
    },
  },
})

export const { openDialog, closeDialog } = dialogSlice.actions

export const selectDialogState = (state: { dialog: DialogState }) => state.dialog

export default dialogSlice.reducer
