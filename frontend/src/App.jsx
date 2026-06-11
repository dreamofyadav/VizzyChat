// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import './styles/tokens.css';

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<ChatPage />} />
      <Route path="/c/:id"   element={<ChatPage />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}
