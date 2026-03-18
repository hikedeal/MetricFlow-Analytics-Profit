import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useCustomers(params: any = {}) {
    return useQuery({
        queryKey: ['customers', params],
        queryFn: async () => {
            const { data } = await api.get('/customers', { params });
            return data;
        },
        placeholderData: (previousData) => previousData
    });
}
