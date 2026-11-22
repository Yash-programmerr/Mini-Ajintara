import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import queryClient from './lib/queryClient.js';
import { AuthProvider } from './hooks/AuthProvider.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider><AppRoutes /></AuthProvider>
        <Toaster position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
