import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { CreateCurrencyAccountRequest, UpdateCurrencyAccountRequest } from '@shared/api';

export const currencyAccountKeys = {
  all: ['currency-accounts'] as const,
  lists: () => [...currencyAccountKeys.all, 'list'] as const,
};

export function useCurrencyAccounts() {
  return useQuery({
    queryKey: currencyAccountKeys.lists(),
    queryFn: () => api.getCurrencyAccounts(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCurrencyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCurrencyAccountRequest) => api.createCurrencyAccount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: currencyAccountKeys.lists() });
    },
  });
}

export function useUpdateCurrencyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCurrencyAccountRequest }) => api.updateCurrencyAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: currencyAccountKeys.lists() });
    },
  });
}

export function useDeleteCurrencyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCurrencyAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: currencyAccountKeys.lists() });
    },
  });
}
