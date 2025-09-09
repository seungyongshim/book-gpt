import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Tailwind 기반 글로벌 스타일
import './styles/tailwind.css'
import 'highlight.js/styles/github.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)