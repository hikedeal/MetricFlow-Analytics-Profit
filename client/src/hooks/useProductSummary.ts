import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useProductSummary(params: any = {}) {
    return useQuery({
        queryKey: ['products-summary', params],
        queryFn: async () => {
            const { data } = await api.get('/products/summary', { params });
            return data;
        },
    });
}
