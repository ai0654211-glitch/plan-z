import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import PasswordStrength from '../../components/auth/PasswordStrength.jsx';
import './Auth.css';

const Register = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        feedback: []
    });

    // إعادة التوجيه إذا كان المستخدم مسجل الدخول بالفعل
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // معالجة تغيير الحقول
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        const sanitizedValue = type === 'checkbox' ? checked : FrontendSecurity.sanitizeInput(value);
        
        setFormData(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));

        // تحقق من قوة كلمة المرور
        if (name === 'password') {
            checkPasswordStrength(value);
        }

        // مسح الخطأ عند البدء بالكتابة
        if (error) setError('');
    };

    // التحقق من قوة كلمة المرور
    const checkPasswordStrength = (password) => {
        let score = 0;
        const feedback = [];

        if (password.length >= 8) score += 25;
        else feedback.push('8 أحرف على الأقل');

        if (/[A-Z]/.test(password)) score += 25;
        else feedback.push('حرف كبير واحد على الأقل');

        if (/[a-z]/.test(password)) score += 25;
        else feedback.push('حرف صغير واحد على الأقل');

        if (/[0-9]/.test(password)) score += 15;
        else feedback.push('رقم واحد على الأقل');

        if (/[^A-Za-z0-9]/.test(password)) score += 10;
        else feedback.push('رمز خاص واحد على الأقل');

        setPasswordStrength({
            score,
            feedback: feedback.length > 0 ? feedback : ['قوية جداً!']
        });
    };

    // التحقق من صحة النموذج
    const validateForm = () => {
        // التحقق من الحقول المطلوبة
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            setError('جميع الحقول مطلوبة');
            return false;
        }

        // التحقق من البريد الإلكتروني
        if (!FrontendSecurity.validateEmail(formData.email)) {
            setError('يرجى إدخال بريد إلكتروني صحيح');
            return false;
        }

        // التحقق من رقم الهاتف
        const phoneRegex = /^(009665|9665|\+9665|05)(5|0|3|6|4|9|1|7|8)([0-9]{7})$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            setError('يرجى إدخال رقم هاتف سعودي صحيح');
            return false;
        }

        // التحقق من قوة كلمة المرور
        if (passwordStrength.score < 70) {
            setError('كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى');
            return false;
        }

        // التحقق من تطابق كلمتي المرور
        if (formData.password !== formData.confirmPassword) {
            setError('كلمتا المرور غير متطابقتين');
            return false;
        }

        // التحقق من الموافقة على الشروط
        if (!formData.agreeToTerms) {
            setError('يجب الموافقة على الشروط والأحكام');
            return false;
        }

        return true;
    };

    // معالجة إنشاء الحساب
    const handleRegister = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            // هنا سيتم استدعاء API إنشاء الحساب
            // مؤقتاً: محاكاة نجاح التسجيل
            await new Promise(resolve => setTimeout(resolve, 2000));

            FrontendSecurity.logSecurityEvent('REGISTRATION_SUCCESSFUL', {
                email: formData.email,
                firstName: formData.firstName
            });

            // عرض رسالة نجاح والتوجيه لصفحة تسجيل الدخول
            alert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
            navigate('/login');
            
        } catch (err) {
            const errorMessage = 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.';
            setError(errorMessage);
            
            FrontendSecurity.logSecurityEvent('REGISTRATION_ERROR', {
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
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            agreeToTerms: false
        });
        setPasswordStrength({ score: 0, feedback: [] });
        setError('');
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* رأس الصفحة */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🛡️</span>
                        <span className="logo-text">SecureStore</span>
                    </div>
                    <h1 className="auth-title">إنشاء حساب آمن</h1>
                    <p className="auth-subtitle">
                        أنشئ حسابك للتمتع بتجربة تسوق آمنة ومحمية
                    </p>
                </div>

                {/* نموذج إنشاء الحساب */}
                <form onSubmit={handleRegister} className="auth-form">
                    {/* الاسم الأول */}
                    <div className="form-group">
                        <label htmlFor="firstName" className="form-label">
                            الاسم الأول
                        </label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="ادخل اسمك الأول"
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* الاسم الأخير */}
                    <div className="form-group">
                        <label htmlFor="lastName" className="form-label">
                            الاسم الأخير
                        </label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="ادخل اسمك الأخير"
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>

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

                    {/* رقم الهاتف */}
                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                            رقم الهاتف
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="ادخل رقم هاتفك (05xxxxxxxx)"
                            className="form-input"
                            required
                            autoComplete="tel"
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
                            placeholder="اختر كلمة مرور قوية"
                            className="form-input"
                            required
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        <PasswordStrength 
                            strength={passwordStrength}
                        />
                    </div>

                    {/* تأكيد كلمة المرور */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            تأكيد كلمة المرور
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="أعد إدخال كلمة المرور"
                            className="form-input"
                            required
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    {/* الموافقة على الشروط */}
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                name="agreeToTerms"
                                type="checkbox"
                                checked={formData.agreeToTerms}
                                onChange={handleInputChange}
                                disabled={loading}
                            />
                            <span className="checkmark"></span>
                            أوافق على{' '}
                            <Link to="/terms" className="terms-link">
                                الشروط والأحكام
                            </Link>{' '}
                            و{' '}
                            <Link to="/privacy" className="terms-link">
                                سياسة الخصوصية
                            </Link>
                        </label>
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
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    جاري إنشاء الحساب...
                                </>
                            ) : (
                                'إنشاء حساب آمن'
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
                        لديك حساب بالفعل؟{' '}
                        <Link to="/login" className="auth-link">
                            تسجيل الدخول
                        </Link>
                    </p>
                </div>

                {/* معلومات الأمان */}
                <div className="security-info">
                    <h4>ماذا يعني الحساب الآمن؟</h4>
                    <div className="security-features">
                        <div className="security-feature">
                            <span className="feature-icon">🔐</span>
                            <div>
                                <strong>تشفير البيانات</strong>
                                <p>جميع بياناتك مشفرة باستخدام AES-256</p>
                            </div>
                        </div>
                        <div className="security-feature">
                            <span className="feature-icon">🛡️</span>
                            <div>
                                <strong>حماية الحساب</strong>
                                <p>مراقبة مستمرة لاكتشاف النشاط المشبوه</p>
                            </div>
                        </div>
                        <div className="security-feature">
                            <span className="feature-icon">📧</span>
                            <div>
                                <strong>تحقق البريد</strong>
                                <p>سيتم إرسال رابط تحقق لبريدك الإلكتروني</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;