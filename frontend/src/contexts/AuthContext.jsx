import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { FrontendSecurity } from '../utils/security.js';
import { authAPI } from '../services/api.js';

const AuthContext = createContext();

// أنواع الإجراءات
const ACTION_TYPES = {
    LOGIN_START: 'LOGIN_START',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    UPDATE_USER: 'UPDATE_USER',
    SET_LOADING: 'SET_LOADING'
};

// الحالة الأولية
const initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
};

// reducer لإدارة الحالة
function authReducer(state, action) {
    switch (action.type) {
        case ACTION_TYPES.LOGIN_START:
            return {
                ...state,
                isLoading: true,
                error: null
            };

        case ACTION_TYPES.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
                tokens: action.payload.tokens,
                isAuthenticated: true,
                isLoading: false,
                error: null
            };

        case ACTION_TYPES.LOGIN_FAILURE:
            return {
                ...state,
                user: null,
                tokens: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload
            };

        case ACTION_TYPES.LOGOUT:
            return {
                ...initialState,
                isLoading: false
            };

        case ACTION_TYPES.UPDATE_USER:
            return {
                ...state,
                user: { ...state.user, ...action.payload }
            };

        case ACTION_TYPES.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload
            };

        default:
            return state;
    }
}

// مكون Provider الرئيسي
export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // تحميل بيانات المصادقة عند التحميل
    useEffect(() => {
        initializeAuth();
    }, []);

    // تهيئة المصادقة
    const initializeAuth = async () => {
        try {
            const tokens = FrontendSecurity.getAuthToken();
            
            if (!tokens) {
                dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
                return;
            }

            // التحقق من صحة التوكن
            const response = await authAPI.verifyToken();
            
            if (response.success) {
                dispatch({
                    type: ACTION_TYPES.LOGIN_SUCCESS,
                    payload: {
                        user: response.user,
                        tokens
                    }
                });
            } else {
                // التوكن غير صالح، تنظيف التخزين
                FrontendSecurity.clearAuth();
                dispatch({ type: ACTION_TYPES.LOGOUT });
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            FrontendSecurity.clearAuth();
            dispatch({ type: ACTION_TYPES.LOGOUT });
        } finally {
            dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
        }
    };

    // تسجيل الدخول
    const login = async (credentials) => {
        try {
            dispatch({ type: ACTION_TYPES.LOGIN_START });

            // تنظيف البيانات المدخلة
            const sanitizedCredentials = {
                email: FrontendSecurity.sanitizeInput(credentials.email),
                password: credentials.password // لا ننظف كلمة المرور
            };

            const response = await authAPI.login(sanitizedCredentials);

            if (response.success) {
                // حفظ التوكنات بشكل آمن
                FrontendSecurity.setAuthToken(response.tokens.accessToken);
                FrontendSecurity.secureSetItem('refresh_token', response.tokens.refreshToken);
                FrontendSecurity.secureSetItem('user_data', response.user);

                dispatch({
                    type: ACTION_TYPES.LOGIN_SUCCESS,
                    payload: {
                        user: response.user,
                        tokens: response.tokens
                    }
                });

                FrontendSecurity.logSecurityEvent('LOGIN_SUCCESS', {
                    userId: response.user.id,
                    email: response.user.email
                });

                return { success: true };
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message;
            
            dispatch({
                type: ACTION_TYPES.LOGIN_FAILURE,
                payload: errorMessage
            });

            FrontendSecurity.logSecurityEvent('LOGIN_FAILED', {
                email: credentials.email,
                error: errorMessage
            });

            return { success: false, error: errorMessage };
        }
    };

    // تسجيل الخروج
    const logout = async (logoutAll = false) => {
        try {
            if (logoutAll) {
                await authAPI.logoutAll();
            }

            FrontendSecurity.clearAuth();
            dispatch({ type: ACTION_TYPES.LOGOUT });

            FrontendSecurity.logSecurityEvent('LOGOUT', {
                logoutAll,
                userId: state.user?.id
            });
        } catch (error) {
            console.error('Logout error:', error);
            // نظف التخزين المحلي حتى لو فشل الطلب للسيرفر
            FrontendSecurity.clearAuth();
            dispatch({ type: ACTION_TYPES.LOGOUT });
        }
    };

    // تحديث بيانات المستخدم
    const updateUser = (userData) => {
        dispatch({
            type: ACTION_TYPES.UPDATE_USER,
            payload: userData
        });

        // تحديث التخزين المحلي
        FrontendSecurity.secureSetItem('user_data', {
            ...state.user,
            ...userData
        });
    };

    // تجديد التوكن
    const refreshToken = async () => {
        try {
            const refreshToken = FrontendSecurity.secureGetItem('refresh_token');
            
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await authAPI.refreshToken({ refreshToken });

            if (response.success) {
                FrontendSecurity.setAuthToken(response.accessToken);
                
                dispatch({
                    type: ACTION_TYPES.UPDATE_USER,
                    payload: { tokens: response.accessToken }
                });

                return response.accessToken;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            logout();
            throw error;
        }
    };

    // التحقق من الصلاحيات
    const hasRole = (requiredRole) => {
        if (!state.user) return false;
        
        const userRole = state.user.role;
        const roleHierarchy = {
            user: ['user'],
            vendor: ['user', 'vendor'],
            admin: ['user', 'vendor', 'admin'],
            super_admin: ['user', 'vendor', 'admin', 'super_admin']
        };

        return roleHierarchy[userRole]?.includes(requiredRole) || false;
    };

    const value = {
        // State
        ...state,
        
        // Actions
        login,
        logout,
        updateUser,
        refreshToken,
        hasRole,
        
        // Convenience
        isAdmin: hasRole('admin'),
        isVendor: hasRole('vendor'),
        isSuperAdmin: hasRole('super_admin')
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook لاستخدام السياق
export function useAuth() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
}

export default AuthContext;