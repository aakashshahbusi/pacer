import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './store/store'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
