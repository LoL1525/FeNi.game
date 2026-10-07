import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClientProvider } from '@solana/react'
import { solanaClient } from './solana/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClientProvider client={solanaClient}>
      <App />
    </ClientProvider>
  </StrictMode>,
)
