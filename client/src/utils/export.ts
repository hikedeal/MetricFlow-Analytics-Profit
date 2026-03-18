import api from '../services/api';

export async function triggerExport(endpoint: string, filename: string, data?: any, method: 'GET' | 'POST' = 'GET') {
    try {
        const config: any = {
            responseType: 'blob',
            headers: {
                'Accept': 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        };

        let response;
        if (method === 'GET') {
            config.params = data;
            response = await api.get(endpoint, config);
        } else {
            response = await api.post(endpoint, data, config);
        }

        // If response is actually JSON (error), it will still be a blob here
        if (response.data.type === 'application/json') {
            const text = await response.data.text();
            const error = JSON.parse(text);
            throw new Error(error.message || 'Export failed');
        }

        // Create a URL for the blob
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);

        // Append to the document and trigger click
        document.body.appendChild(link);
        link.click();

        // Cleanup
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        console.error('Export failed:', error);
        const message = error.message || 'Failed to export data. Please try again.';
        alert(message);
    }
}
