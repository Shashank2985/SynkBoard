import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Make this env variable later if needed
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach token
api.interceptors.request.use(
    (config) => {
        // We can't access Zustand directly outside of components easily in a clean way for interceptors 
        // without reading from localStorage or subscribing. 
        // For MVP, reading from localStorage is simplest since we use 'persist' middleware associated with 'user-storage'.
        // However, Zustand persist saves to localStorage with a specific key structure.

        const storage = localStorage.getItem('user-storage');
        if (storage) {
            const { state } = JSON.parse(storage);
            if (state?.token) {
                config.headers.Authorization = `Bearer ${state.token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
