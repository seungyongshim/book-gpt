import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// SCSS main file - includes all styles
import './styles/scss/main.scss'
// External CSS dependencies
import './styles/css/bootstrap/bootstrap.min.css'
import 'highlight.js/styles/github.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)