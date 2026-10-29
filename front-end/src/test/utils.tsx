import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { AppRoutes } from '../App';
import { AuthProvider } from '../context/AuthContext';
import { createQueryClient } from '../api/queryClient';

export function renderApp(route = '/', ui?: ReactElement) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui ?? <AppRoutes />}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
