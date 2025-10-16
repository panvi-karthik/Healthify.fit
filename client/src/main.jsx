import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import App from './App.jsx'
import { ToastsProvider } from './components/Toasts'

// Force dark theme globally
if (typeof document !== 'undefined') {
  document.body.classList.add('dark')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastsProvider>
        <App />
      </ToastsProvider>
    </BrowserRouter>
  </StrictMode>,
)
