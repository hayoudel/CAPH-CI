import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './App';
import { AuthProvider } from './context/AuthContext';
import { createQueryClient } from './api/queryClient';
import './index.css';

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCK_API !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` } });
}

const queryClient = createQueryClient();

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
