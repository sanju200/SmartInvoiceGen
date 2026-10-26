import { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

export interface RenderOptions {
  router?: MemoryRouterProps;
  queryClient?: QueryClient;
  wrappers?: ReactElement[];
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const qc = options.queryClient ?? new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let wrapped = (
    <QueryClientProvider client={qc}>
      <MemoryRouter {...options.router}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

  if (options.wrappers && options.wrappers.length) {
    wrapped = options.wrappers.reduceRight((acc, Wrapper) => <>{Wrapper}{acc}</>, wrapped);
  }

  return rtlRender(wrapped);
}
