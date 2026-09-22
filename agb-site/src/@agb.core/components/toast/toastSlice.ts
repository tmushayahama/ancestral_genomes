import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

export type ToastLevel = 'info' | 'success' | 'warning' | 'error'

export interface ToastState {
  open: boolean
  level: ToastLevel
  title?: string
  message: string
}

const initialState: ToastState = {
  open: false,
  level: 'info',
  message: '',
}

export const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (_state, action: PayloadAction<Omit<ToastState, 'open'>>) => ({
      ...action.payload,
      open: true,
    }),
    hideToast: state => {
      state.open = false
    },
  },
})

export const { showToast, hideToast } = toastSlice.actions

export const selectToast = (state: { toast: ToastState }) => state.toast

export default toastSlice.reducer
