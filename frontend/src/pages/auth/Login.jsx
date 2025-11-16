import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import SecurityVerification from '../../components/auth/SecurityVerification.jsx';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const { login, isAuthenticated } = useAuth();
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        twoFactorCode: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [securityCheck, setSecurityCheck] = useState({
        isHuman: false,
        riskLevel: 'low'
    });

    // إعادة التوجيه إذا كان المستخدم مسجل الدخول بالفعل
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    // التحقق من الأمان عند التحميل
    useEffect(() => {
        performSecurityCheck();
    }, []);

    // إجراء فحص أمان أولي
    const performSecurityCheck = () => {
        const checks = {
            hasJavaScript: true,
            screenSize: window.screen.width > 320,
            userAgent: navigator.userAgent,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const riskLevel = calculateRiskLevel(checks);
        setSecurityCheck({
            isHuman: riskLevel === 'low',
            riskLevel
        });

        FrontendSecurity.logSecurityEvent('LOGIN_PAGE_LOADED', {
            riskLevel,
            checks
        });
    };

    // حساب مستوى المخاطرة
    const calculateRiskLevel = (checks) => {
        let riskScore = 0;

        if (!checks.hasJavaScript) riskScore += 30;
        if (!checks.screenSize) riskScore += 20;
        if (checks.userAgent.includes('bot')) riskScore += 40;
        if (!checks.timezone) riskScore += 10;

        if (riskScore >= 50) return 'high';
        if (riskScore >= 20) return 'medium';
        return 'low';
    };

    // معالجة تغيير الحقول
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // تنظيف البيانات المدخلة
        const sanitizedValue = name === 'password' ? value : FrontendSecurity.sanitizeInput(value);
        
        setFormData(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));

        // مسح الخطأ عند البدء بالكتابة
        if (error) setError('');
    };

    // التحقق من صحة النموذج
    const validateForm = () => {
        if (!formData.email || !formData.password) {
            setError('البريد الإلكتروني وكلمة المرور مطلوبان');
            return false;
        }

        if (!FrontendSecurity.validateEmail(formData.email)) {
            setError('يرجى إدخال بريد إلكتروني صحيح');
            return false;
        }

        if (formData.password.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return false;
        }

        return true;
    };

    // معالجة تسجيل الدخول
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!securityCheck.isHuman) {
            setError('تم اكتشاف نشاط مشبوه. يرجى المحاولة مرة أخرى.');
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const result = await login(formData);

            if (result.success) {
                // تسجيل نجاح تسجيل الدخول
                FrontendSecurity.logSecurityEvent('LOGIN_SUCCESSFUL', {
                    email: formData.email,
                    has2FA: showTwoFactor
                });

                // إعادة التوجيه للصفحة السابقة أو الرئيسية
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
                
            } else {
                // معالجة أخطاء محددة
                if (result.error.includes('2FA_REQUIRED')) {
                    setShowTwoFactor(true);
                    setError('يرجى إدخال رمز التحقق بخطوتين');
                } else if (result.error.includes('ACCOUNT_LOCKED')) {
                    setError('تم تعطيل الحساب مؤقتاً بسبب محاولات تسجيل دخول متعددة فاشلة');
                } else {
                    setError(result.error);
                }

                FrontendSecurity.logSecurityEvent('LOGIN_FAILED', {
                    email: formData.email,
                    error: result.error
                });
            }
        } catch (err) {
            const errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
            setError(errorMessage);
            
            FrontendSecurity.logSecurityEvent('LOGIN_ERROR', {
                email: formData.email,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // إعادة تعيين النموذج
    const handleReset = () => {
        setFormData({
            email: '',
            password: '',
            twoFactorCode: ''
        });
        setError('');
        setShowTwoFactor(false);
    };

    // إذا كان هناك مخاطرة عالية، عرض تحقق إضافي
    if (securityCheck.riskLevel === 'high') {
        return (
            <div className="auth-page high-risk">
                <div className="auth-container">
                    <div className="security-alert">
                        <div className="alert-icon">🛡️</div>
                        <h2>تحقق أمان إضافي مطلوب</h2>
                        <p>
                            تم اكتشاف نشاط غير عادي. يرجى إكمال التحقق الأمني للمتابعة.
                        </p>
                        <SecurityVerification
                            onVerificationComplete={() => {
                                setSecurityCheck(prev => ({ ...prev, isHuman: true, riskLevel: 'low' }));
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* رأس الصفحة */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🛡️</span>
                        <span className="logo-text">SecureStore</span>
                    </div>
                    <h1 className="auth-title">تسجيل الدخول الآمن</h1>
                    <p className="auth-subtitle">
                        أدخل بياناتك للوصول إلى حسابك بشكل آمن
                    </p>
                </div>

                {/* مؤشر الأمان */}
                <div className="security-status">
                    <div className={`status-indicator ${securityCheck.riskLevel}`}>
                        <span className="status-dot"></span>
                        {securityCheck.riskLevel === 'low' ? 'الأمان: ممتاز' :
                         securityCheck.riskLevel === 'medium' ? 'الأمان: متوسط' :
                         'الأمان: منخفض'}
                    </div>
                </div>

                {/* نموذج تسجيل الدخول */}
                <form onSubmit={handleLogin} className="auth-form">
                    {/* البريد الإلكتروني */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            البريد الإلكتروني
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="ادخل بريدك الإلكتروني"
                            className="form-input"
                            required
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    {/* كلمة المرور */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            كلمة المرور
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="ادخل كلمة المرور"
                            className="form-input"
                            required
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    {/* التحقق بخطوتين */}
                    {showTwoFactor && (
                        <div className="form-group">
                            <label htmlFor="twoFactorCode" className="form-label">
                                رمز التحقق بخطوتين
                            </label>
                            <input
                                id="twoFactorCode"
                                name="twoFactorCode"
                                type="text"
                                value={formData.twoFactorCode}
                                onChange={handleInputChange}
                                placeholder="ادخل الرمز من تطبيق المصادقة"
                                className="form-input"
                                required
                                autoComplete="one-time-code"
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* خيارات إضافية */}
                    <div className="form-options">
                        <label className="checkbox-label">
                            <input type="checkbox" />
                            <span className="checkmark"></span>
                            تذكرني
                        </label>
                        
                        <Link to="/forgot-password" className="forgot-link">
                            نسيت كلمة المرور؟
                        </Link>
                    </div>

                    {/* رسالة الخطأ */}
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* أزرار الإجراء */}
                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-large btn-block"
                            disabled={loading || !securityCheck.isHuman}
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    جاري تسجيل الدخول...
                                </>
                            ) : (
                                'تسجيل الدخول الآمن'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn btn-secondary btn-block"
                            disabled={loading}
                        >
                            إعادة تعيين
                        </button>
                    </div>
                </form>

                {/* روابط إضافية */}
                <div className="auth-links">
                    <p>
                        ليس لديك حساب؟{' '}
                        <Link to="/register" className="auth-link">
                            إنشاء حساب جديد
                        </Link>
                    </p>
                </div>

                {/* معلومات الأمان */}
                <div className="security-info">
                    <div className="security-features">
                        <div className="security-feature">
                            <span className="feature-icon">🔒</span>
                            <span>تشفير البيانات</span>
                        </div>
                        <div className="security-feature">
                            <span className="feature-icon">🛡️</span>
                            <span>حماية من الاختراق</span>
                        </div>
                        <div className="security-feature">
                            <span className="feature-icon">📱</span>
                            <span>جلسات آمنة</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;