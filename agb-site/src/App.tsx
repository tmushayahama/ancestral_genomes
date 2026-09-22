import type React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { mantineTheme } from '@/@agb.core/theme/mantineTheme'
import { routes } from '@/app/routes/routes'

const router = createBrowserRouter(routes, {
  basename: import.meta.env.VITE_BASE_URL,
})

/**
 * The global dialog and toast hosts are mounted inside `Layout`, not here —
 * their content links between routes and so needs router context.
 */
const App: React.FC = () => (
  <MantineProvider theme={mantineTheme}>
    <Notifications position="bottom-left" />
    <RouterProvider router={router} />
  </MantineProvider>
)

export default App
