// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--bg-3)',
            color: 'var(--text)',
            border: '0.5px solid var(--border-md)',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: '300',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
