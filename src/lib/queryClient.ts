import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Alterado para true para manter dados atualizados
      staleTime: 1000 * 60, // Reduzido para 1 minuto
      gcTime: 1000 * 60 * 5, // 5 minutos
      refetchOnMount: true, // Alterado para true
      refetchOnReconnect: true // Alterado para true
    }
  }
})