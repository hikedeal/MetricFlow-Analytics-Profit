import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useOrders(params: any = {}) {
    return useQuery({
        queryKey: ['orders', params],
        queryFn: async () => {
            const { data } = await api.get('/orders', { params });
            return data;
        },
        placeholderData: (previousData) => previousData
    });
}

export function useOrderStats(params: any = {}) {
    return useQuery({
        queryKey: ['orderStats', params],
        queryFn: async () => {
            const { data } = await api.get('/orders/stats', { params });
            return data;
        }
    });
}
