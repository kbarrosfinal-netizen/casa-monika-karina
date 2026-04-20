import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-6">
      <h1 className="text-2xl font-bold">Casa &amp; Família</h1>
      <p>Scaffold ok.</p>
    </div>
  </StrictMode>
)
