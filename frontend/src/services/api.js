import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response ? .status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const productsAPI = {
    getProducts: async() => {
        const response = await api.get('/products');
        return response.data;
    },

    getProduct: async(id) => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    createProduct: async(productData) => {
        const response = await api.post('/products', productData);
        return response.data;
    },

    updateProduct: async(id, productData) => {
        const response = await api.put(`/products/${id}`, productData);
        return response.data;
    },

    deleteProduct: async(id) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },
};

export const authAPI = {
    login: async(credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    register: async(userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    getCurrentUser: async() => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    updateProfile: async(userData) => {
        const response = await api.put('/auth/profile', userData);
        return response.data;
    },
};

export const ordersAPI = {
    createOrder: async(orderData) => {
        const response = await api.post('/orders', orderData);
        return response.data;
    },

    getUserOrders: async() => {
        const response = await api.get('/orders/my-orders');
        return response.data;
    },

    getOrder: async(id) => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },
};

export default api;