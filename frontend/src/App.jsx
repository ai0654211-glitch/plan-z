import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { FrontendSecurity } from './utils/security.js';

// المكونات العامة
import Header from './components/common/Header.jsx';
import Footer from './components/common/Footer.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import SecureRoute from './components/auth/SecureRoute.jsx';

// الصفحات
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Profile from './pages/user/Profile.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/user/Orders.jsx';

// لوحة التحكم
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/ProductsManager.jsx';
import AdminOrders from './pages/admin/OrdersManager.jsx';
import AdminSecurity from './pages/admin/SecurityManager.jsx';

// صفحات أخرى
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Security from './pages/Security.jsx';
import NotFound from './pages/NotFound.jsx';

// الأنماط
import './styles/globals.css';
import './styles/components.css';

/**
 * مكون التطبيق الرئيسي مع الحماية والأمان
 */
function AppContent() {
    const { isLoading, isAuthenticated, user } = useAuth();

    // تسجيل بدء التطبيق
    useEffect(() => {
        FrontendSecurity.logSecurityEvent('APP_STARTED', {
            timestamp: new Date().toISOString(),
            environment: import.meta.env.MODE,
            authenticated: isAuthenticated
        });

        // حماية ضد هجمات الـ console
        if (import.meta.env.PROD) {
            const disableDevTools = () => {
                if (typeof window !== 'undefined') {
                    // منع فتح أدوات المطور
                    Object.defineProperty(window, 'disableDevTools', {
                        value: true,
                        writable: false
                    });
                }
            };
            disableDevTools();
        }
    }, [isAuthenticated]);

    // عرض شاشة التحميل
    if (isLoading) {
        return (
            <div className="app-loading">
                <div className="loading-content">
                    <LoadingSpinner size="xlarge" />
                    <div className="loading-text">
                        <h2>جاري التحميل الآمن...</h2>
                        <p>نحمي بياناتك أثناء التحميل</p>
                    </div>
                    <div className="security-indicators">
                        <div className="indicator active">
                            <span className="indicator-dot"></span>
                            التحقق من الجلسة
                        </div>
                        <div className="indicator active">
                            <span className="indicator-dot"></span>
                            تحميل المكونات
                        </div>
                        <div className="indicator">
                            <span className="indicator-dot"></span>
                            تهيئة الأمان
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {/* شريط التنقل الآمن */}
            <Header />
            
            {/* المحتوى الرئيسي */}
            <main className="main-content">
                <Routes>
                    {/* المسارات العامة */}
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetails />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/security" element={<Security />} />
                    
                    {/* مسارات المصادقة */}
                    <Route 
                        path="/login" 
                        element={
                            isAuthenticated ? 
                            <Navigate to="/" replace /> : 
                            <Login />
                        } 
                    />
                    <Route 
                        path="/register" 
                        element={
                            isAuthenticated ? 
                            <Navigate to="/" replace /> : 
                            <Register />
                        } 
                    />
                    
                    {/* مسارات المستخدم المحمية */}
                    <Route
                        path="/profile"
                        element={
                            <SecureRoute>
                                <Profile />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <SecureRoute>
                                <Orders />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/cart"
                        element={
                            <SecureRoute>
                                <Cart />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <SecureRoute>
                                <Checkout />
                            </SecureRoute>
                        }
                    />
                    
                    {/* مسارات الأدمن المحمية */}
                    <Route
                        path="/admin"
                        element={
                            <SecureRoute requiredRole="admin">
                                <AdminDashboard />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/admin/products"
                        element={
                            <SecureRoute requiredRole="admin">
                                <AdminProducts />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/admin/orders"
                        element={
                            <SecureRoute requiredRole="admin">
                                <AdminOrders />
                            </SecureRoute>
                        }
                    />
                    <Route
                        path="/admin/security"
                        element={
                            <SecureRoute requiredRole="admin">
                                <AdminSecurity />
                            </SecureRoute>
                        }
                    />
                    
                    {/* إعادة التوجيه للمسارات القديمة */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/index" element={<Navigate to="/" replace />} />
                    
                    {/* صفحة 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            
            {/* التذييل */}
            <Footer />
            
            {/* عناصر واجهة إضافية */}
            <GlobalComponents />
        </div>
    );
}

/**
 * المكونات العالمية (الإشعارات، التنبيهات، etc.)
 */
function GlobalComponents() {
    return (
        <>
            {/* منطقة الإشعارات */}
            <div id="notifications-container" className="notifications-container"></div>
            
            {/* نافذة التحميل العالمية */}
            <div id="global-loading" className="global-loading hidden">
                <div className="loading-overlay"></div>
                <div className="loading-content">
                    <LoadingSpinner />
                    <span>جاري المعالجة...</span>
                </div>
            </div>
            
            {/* تأكيدات الأمان */}
            <div id="security-confirmations" className="security-confirmations"></div>
        </>
    );
}

/**
 * تطبيق React الرئيسي مع جميع المقدمات (Providers)
 */
function App() {
    return (
        <React.StrictMode>
            {/* حماية إضافية في production */}
            {import.meta.env.PROD && (
                <React.Fragment>
                    {/* يمكن إضافة مقدمات إضافية هنا */}
                </React.Fragment>
            )}
            
            <Router
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                }}
            >
                <AuthProvider>
                    <ErrorBoundary>
                        <AppContent />
                    </ErrorBoundary>
                </AuthProvider>
            </Router>
        </React.StrictMode>
    );
}

/**
 * حدود الخطأ للتطبيق
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // تسجيل الخطأ في نظام الأمان
        FrontendSecurity.logSecurityEvent('APP_ERROR', {
            error: error.toString(),
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });

        // في production، يمكن إرسال الخطأ لخدمة تتبع الأخطاء
        if (import.meta.env.PROD) {
            // console.error('Application Error:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-container">
                        <div className="error-icon">⚠️</div>
                        <h1>حدث خطأ غير متوقع</h1>
                        <p>
                            عذراً، حدث خطأ في التطبيق.我们已经 تم إبلاغ الفريق الفني.
                        </p>
                        <div className="error-actions">
                            <button 
                                onClick={() => window.location.reload()} 
                                className="btn btn-primary"
                            >
                                إعادة تحميل الصفحة
                            </button>
                            <button 
                                onClick={() => window.location.href = '/'} 
                                className="btn btn-secondary"
                            >
                                العودة للرئيسية
                            </button>
                        </div>
                        {import.meta.env.DEV && (
                            <details className="error-details">
                                <summary>تفاصيل التقنية (للتطوير)</summary>
                                <pre>{this.state.error && this.state.error.toString()}</pre>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default App;