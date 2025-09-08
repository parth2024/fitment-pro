import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import { Toaster } from 'react-hot-toast'
import { theme } from './theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </MantineProvider>
  </React.StrictMode>,
)