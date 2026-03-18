import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useProducts(params: any = {}) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: async () => {
            const { data } = await api.get('/products', { params });
            return data;
        },
        placeholderData: (previousData) => previousData
    });
}
