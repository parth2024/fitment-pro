import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <App />
      <Toaster position="top-right" />
    </MantineProvider>
  </React.StrictMode>,
)