import axios from 'axios';
import { FrontendSecurity } from '../utils/security.js';

// إنشاء instance مخصص لـ axios
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// طلب interceptors
apiClient.interceptors.request.use(
    (config) => {
        // إضافة التوكن لجميع الطلبات
        const token = FrontendSecurity.getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // إضافة توقيع الأمان للطلبات الحساسة
        if (config.requiresSignature) {
            const timestamp = Date.now().toString();
            const dataToSign = `${timestamp}:${JSON.stringify(config.data || '')}`;
            const signature = FrontendSecurity.generateSignature(dataToSign);

            config.headers['X-Signature'] = signature;
            config.headers['X-Timestamp'] = timestamp;
        }

        // تسجيل الطلب للأمان
        FrontendSecurity.logSecurityEvent('API_REQUEST', {
            url: config.url,
            method: config.method,
            hasAuth: !!token
        });

        return config;
    },
    (error) => {
        FrontendSecurity.logSecurityEvent('API_REQUEST_ERROR', {
            error: error.message
        });
        return Promise.reject(error);
    }
);

// رد interceptors
apiClient.interceptors.response.use(
    (response) => {
        // تسجيل الرد الناجح
        FrontendSecurity.logSecurityEvent('API_RESPONSE_SUCCESS', {
            url: response.config.url,
            status: response.status
        });

        return response;
    },
    async(error) => {
        const originalRequest = error.config;

        // تسجيل خطأ الرد
        FrontendSecurity.logSecurityEvent('API_RESPONSE_ERROR', {
            url: error.config?.url,
            status: error.response?.status,
            error: error.message
        });

        // إذا كان الخطأ 401 (غير مصرح) ولم نكن نحاول بالفعل تجديد التوكن
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // محاولة تجديد التوكن
                const { refreshToken } = await authAPI.refreshToken();

                if (refreshToken) {
                    // إعادة الطلب الأصلي بالتوكن الجديد
                    originalRequest.headers.Authorization = `Bearer ${refreshToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // إذا فشل تجديد التوكن، تسجيل خروج
                FrontendSecurity.logSecurityEvent('TOKEN_REFRESH_FAILED', {
                    error: refreshError.message
                });

                // تنظيف التخزين وإعادة التوجيه لصفحة تسجيل الدخول
                FrontendSecurity.clearAuth();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // معالجة أخطاء أخرى
        return Promise.reject(error);
    }
);

// خدمة المصادقة
export const authAPI = {
    login: (credentials) =>
        apiClient.post('/auth/login', credentials),

    register: (userData) =>
        apiClient.post('/auth/register', userData),

    logout: () =>
        apiClient.post('/auth/logout'),

    logoutAll: () =>
        apiClient.post('/auth/logout-all'),

    refreshToken: (data) =>
        apiClient.post('/auth/refresh', data),

    verifyToken: () =>
        apiClient.get('/auth/verify')
};

// خدمة المنتجات
export const productsAPI = {
    getProducts: (params = {}) =>
        apiClient.get('/products', { params }),

    getProduct: (id) =>
        apiClient.get(`/products/${id}`),

    createProduct: (productData) =>
        apiClient.post('/products', productData, { requiresSignature: true }),

    updateProduct: (id, productData) =>
        apiClient.put(`/products/${id}`, productData, { requiresSignature: true }),

    deleteProduct: (id) =>
        apiClient.delete(`/products/${id}`),

    // للمسؤولين فقط
    admin: {
        getAllProducts: () =>
            apiClient.get('/products/admin/all'),

        updateProductStatus: (id, status) =>
            apiClient.patch(`/products/admin/${id}/status`, { status })
    }
};

// خدمة المستخدمين
export const usersAPI = {
    getProfile: () =>
        apiClient.get('/users/profile'),

    updateProfile: (userData) =>
        apiClient.put('/users/profile', userData, { requiresSignature: true }),

    changePassword: (passwordData) =>
        apiClient.put('/users/password', passwordData, { requiresSignature: true })
};

// خدمة الطلبات
export const ordersAPI = {
    createOrder: (orderData) =>
        apiClient.post('/orders', orderData, { requiresSignature: true }),

    getOrders: () =>
        apiClient.get('/orders'),

    getOrder: (id) =>
        apiClient.get(`/orders/${id}`),

    cancelOrder: (id) =>
        apiClient.put(`/orders/${id}/cancel`)
};

// خدمة التحميل
export const uploadAPI = {
    uploadImage: (formData) =>
        apiClient.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000
        }),

    uploadVideo: (formData) =>
        apiClient.post('/upload/video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
        })
};

// خدمة الأمان
export const securityAPI = {
    getAuditLogs: (params) =>
        apiClient.get('/security/audit', { params }),

    getSecurityStats: () =>
        apiClient.get('/security/stats')
};

export default apiClient;
