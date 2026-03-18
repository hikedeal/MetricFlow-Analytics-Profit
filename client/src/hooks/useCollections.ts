import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useCollections() {
    return useQuery({
        queryKey: ['collections'],
        queryFn: async () => {
            const { data } = await api.get('/products/collections');
            return data.data; // The API returns { data: [...] }
        },
        placeholderData: []
    });
}
