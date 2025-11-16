import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import SecurityVerification from '../../components/auth/SecurityVerification.jsx';
import './Checkout.css';

const Checkout = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);

    // بيانات النموذج
    const [formData, setFormData] = useState({
        // معلومات الشحن
        shipping: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'Saudi Arabia'
        },
        
        // معلومات الدفع
        payment: {
            method: 'credit_card',
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: '',
            saveCard: false
        },
        
        // خيارات الشحن
        shippingMethod: 'standard',
        
        // مراجعة الطلب
        orderNotes: ''
    });

    // التحقق من المصادقة
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/checkout' } });
            return;
        }

        // فحص أمان إضافي للدفع
        performSecurityCheck();
    }, [isAuthenticated, navigate]);

    // فحص أمان شامل
    const performSecurityCheck = async () => {
        try {
            setLoading(true);
            
            const securityAssessment = await assessCheckoutSecurity();
            
            if (securityAssessment.riskScore >= 50) {
                setNeedsVerification(true);
                
                FrontendSecurity.logSecurityEvent('CHECKOUT_VERIFICATION_REQUIRED', {
                    userId: user?.id,
                    riskScore: securityAssessment.riskScore,
                    reasons: securityAssessment.riskFactors
                });
            }
            
        } catch (error) {
            console.error('Security check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // تقييم أمان عملية الدفع
    const assessCheckoutSecurity = async () => {
        const riskFactors = [];
        let riskScore = 0;

        // فحص عمر الجلسة
        const sessionAge = await getSessionAge();
        if (sessionAge > 3600) {
            riskFactors.push('جلسة قديمة');
            riskScore += 20;
        }

        // فحص عنوان IP
        const ipConsistent = await checkIPConsistency();
        if (!ipConsistent) {
            riskFactors.push('تغيير في عنوان IP');
            riskScore += 30;
        }

        // فحص الجهاز
        const deviceTrusted = await checkDeviceTrust();
        if (!deviceTrusted) {
            riskFactors.push('جهاز غير موثوق');
            riskScore += 25;
        }

        // فحص تاريخ الشراء
        const purchaseHistory = await checkPurchaseHistory();
        if (!purchaseHistory.hasPreviousPurchases) {
            riskFactors.push('عميل جديد');
            riskScore += 15;
        }

        return { riskScore, riskFactors };
    };

    // معالجة تغيير الحقول
    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: FrontendSecurity.sanitizeInput(value)
            }
        }));
    };

    // التحقق من صحة الخطوة
    const validateStep = (stepNumber) => {
        switch (stepNumber) {
            case 1: // معلومات الشحن
                return validateShippingInfo();
            case 2: // معلومات الدفع
                return validatePaymentInfo();
            case 3: // مراجعة الطلب
                return true;
            default:
                return false;
        }
    };

    // التحقق من معلومات الشحن
    const validateShippingInfo = () => {
        const { shipping } = formData;
        const errors = [];

        if (!shipping.firstName.trim()) errors.push('الاسم الأول مطلوب');
        if (!shipping.lastName.trim()) errors.push('الاسم الأخير مطلوب');
        if (!FrontendSecurity.validateEmail(shipping.email)) errors.push('البريد الإلكتروني غير صحيح');
        if (!shipping.phone.trim()) errors.push('رقم الهاتف مطلوب');
        if (!shipping.address.trim()) errors.push('العنوان مطلوب');
        if (!shipping.city.trim()) errors.push('المدينة مطلوبة');
        if (!shipping.postalCode.trim()) errors.push('الرمز البريدي مطلوب');

        if (errors.length > 0) {
            setError(errors.join('، '));
            return false;
        }

        return true;
    };

    // التحقق من معلومات الدفع
    const validatePaymentInfo = () => {
        const { payment } = formData;
        const errors = [];

        if (!payment.cardNumber.trim() || payment.cardNumber.replace(/\s/g, '').length !== 16) {
            errors.push('رقم البطاقة يجب أن يكون 16 رقماً');
        }

        if (!payment.expiryDate.trim() || !/^\d{2}\/\d{2}$/.test(payment.expiryDate)) {
            errors.push('تاريخ الانتهاء يجب أن يكون بالصيغة MM/YY');
        }

        if (!payment.cvv.trim() || payment.cvv.length !== 3) {
            errors.push('رمز CVV يجب أن يكون 3 أرقام');
        }

        if (!payment.cardholderName.trim()) {
            errors.push('اسم حامل البطاقة مطلوب');
        }

        if (errors.length > 0) {
            setError(errors.join('، '));
            return false;
        }

        return true;
    };

    // التقدم للخطوة التالية
    const nextStep = () => {
        if (validateStep(step)) {
            setError('');
            setStep(prev => prev + 1);
            
            FrontendSecurity.logSecurityEvent('CHECKOUT_STEP_COMPLETED', {
                step,
                userId: user?.id
            });
        }
    };

    // الرجوع للخطوة السابقة
    const prevStep = () => {
        setError('');
        setStep(prev => prev - 1);
    };

    // معالجة الدفع النهائية
    const handlePayment = async () => {
        try {
            setProcessing(true);
            setError('');

            // التحقق النهائي
            if (!validateStep(step)) {
                return;
            }

            // تسجيل بدء المعاملة
            FrontendSecurity.logSecurityEvent('PAYMENT_PROCESSING_STARTED', {
                userId: user?.id,
                amount: calculateTotal(),
                paymentMethod: formData.payment.method
            });

            // محاكاة معالجة الدفع
            await new Promise(resolve => setTimeout(resolve, 3000));

            // في التطبيق الحقيقي، هنا سيتم الاتصال ببوابة الدفع
            const paymentSuccess = await processPayment();

            if (paymentSuccess) {
                FrontendSecurity.logSecurityEvent('PAYMENT_SUCCESSFUL', {
                    userId: user?.id,
                    amount: calculateTotal(),
                    transactionId: generateTransactionId()
                });

                // التوجيه لصفحة النجاح
                navigate('/order-success', { 
                    state: { 
                        orderId: generateOrderId(),
                        amount: calculateTotal()
                    }
                });
            } else {
                throw new Error('فشل في معالجة الدفع');
            }

        } catch (error) {
            setError('فشل في معالجة الدفع. يرجى المحاولة مرة أخرى.');
            
            FrontendSecurity.logSecurityEvent('PAYMENT_FAILED', {
                userId: user?.id,
                error: error.message,
                amount: calculateTotal()
            });
        } finally {
            setProcessing(false);
        }
    };

    // معالجة الدفع (محاكاة)
    const processPayment = async () => {
        // في التطبيق الحقيقي، هنا سيتم الاتصال بـ Stripe أو بوابة دفع
        return Math.random() > 0.1; // 90% نجاح للمحاكاة
    };

    // الحسابات
    const calculateSubtotal = () => 2850; // مبلغ تجريبي
    const calculateShipping = () => formData.shippingMethod === 'express' ? 30 : 15;
    const calculateTax = () => calculateSubtotal() * 0.15;
    const calculateTotal = () => calculateSubtotal() + calculateShipping() + calculateTax();

    const generateTransactionId = () => 'TXN-' + Date.now();
    const generateOrderId = () => 'ORD-' + Date.now();

    const getSessionAge = () => 1800; // 30 دقيقة
    const checkIPConsistency = () => Promise.resolve(true);
    const checkDeviceTrust = () => Promise.resolve(true);
    const checkPurchaseHistory = () => Promise.resolve({ hasPreviousPurchases: true });

    // إذا كان يحتاج تحقق أمني
    if (needsVerification) {
        return (
            <div className="checkout-verification">
                <SecurityVerification
                    level="high"
                    onComplete={(success) => {
                        setNeedsVerification(false);
                        if (!success) {
                            navigate('/cart');
                        }
                    }}
                    message="مطلوب تحقق أمني إضافي لإتمام عملية الدفع"
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="checkout-loading">
                <LoadingSpinner 
                    size="large" 
                    text="جاري التحضير للدفع الآمن..."
                />
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="container">
                {/* رأس الصفحة */}
                <div className="page-header">
                    <h1 className="page-title">الدفع الآمن</h1>
                    <div className="security-badges">
                        <span className="security-badge">🔒 SSL Secure</span>
                        <span className="security-badge">🛡️ PCI Compliant</span>
                    </div>
                </div>

                {/* مؤشر التقدم */}
                <div className="checkout-progress">
                    <div className="progress-steps">
                        {[1, 2, 3].map(stepNumber => (
                            <div 
                                key={stepNumber}
                                className={`progress-step ${stepNumber === step ? 'active' : ''} ${stepNumber < step ? 'completed' : ''}`}
                            >
                                <div className="step-number">{stepNumber}</div>
                                <div className="step-label">
                                    {stepNumber === 1 && 'معلومات الشحن'}
                                    {stepNumber === 2 && 'طريقة الدفع'}
                                    {stepNumber === 3 && 'مراجعة الطلب'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* رسالة الخطأ */}
                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                {/* محتوى الخطوات */}
                <div className="checkout-content">
                    {/* الخطوة 1: معلومات الشحن */}
                    {step === 1 && (
                        <div className="checkout-step">
                            <h2>معلومات الشحن</h2>
                            
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>الاسم الأول *</label>
                                    <input
                                        type="text"
                                        value={formData.shipping.firstName}
                                        onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>الاسم الأخير *</label>
                                    <input
                                        type="text"
                                        value={formData.shipping.lastName}
                                        onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>البريد الإلكتروني *</label>
                                    <input
                                        type="email"
                                        value={formData.shipping.email}
                                        onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>رقم الهاتف *</label>
                                    <input
                                        type="tel"
                                        value={formData.shipping.phone}
                                        onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group full-width">
                                    <label>العنوان *</label>
                                    <input
                                        type="text"
                                        value={formData.shipping.address}
                                        onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>المدينة *</label>
                                    <input
                                        type="text"
                                        value={formData.shipping.city}
                                        onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>الرمز البريدي *</label>
                                    <input
                                        type="text"
                                        value={formData.shipping.postalCode}
                                        onChange={(e) => handleInputChange('shipping', 'postalCode', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* طريقة الشحن */}
                            <div className="shipping-methods">
                                <h3>طريقة الشحن</h3>
                                <div className="method-options">
                                    <label className="method-option">
                                        <input
                                            type="radio"
                                            name="shipping"
                                            value="standard"
                                            checked={formData.shippingMethod === 'standard'}
                                            onChange={(e) => setFormData(prev => ({...prev, shippingMethod: e.target.value}))}
                                        />
                                        <div className="method-info">
                                            <span className="method-name">شحن عادي</span>
                                            <span className="method-duration">3-5 أيام عمل</span>
                                            <span className="method-price">15 ر.س</span>
                                        </div>
                                    </label>
                                    
                                    <label className="method-option">
                                        <input
                                            type="radio"
                                            name="shipping"
                                            value="express"
                                            checked={formData.shippingMethod === 'express'}
                                            onChange={(e) => setFormData(prev => ({...prev, shippingMethod: e.target.value}))}
                                        />
                                        <div className="method-info">
                                            <span className="method-name">شحن سريع</span>
                                            <span className="method-duration">1-2 أيام عمل</span>
                                            <span className="method-price">30 ر.س</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* أزرار التنقل */}
                            <div className="step-actions">
                                <button 
                                    onClick={() => navigate('/cart')}
                                    className="btn btn-secondary"
                                >
                                    ← العودة للسلة
                                </button>
                                <button 
                                    onClick={nextStep}
                                    className="btn btn-primary"
                                >
                                    التالي → طريقة الدفع
                                </button>
                            </div>
                        </div>
                    )}

                    {/* الخطوة 2: طريقة الدفع */}
                    {step === 2 && (
                        <div className="checkout-step">
                            <h2>طريقة الدفع</h2>
                            
                            <div className="payment-methods">
                                <label className="payment-method">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="credit_card"
                                        checked={formData.payment.method === 'credit_card'}
                                        onChange={(e) => handleInputChange('payment', 'method', e.target.value)}
                                    />
                                    <span>💳 بطاقة ائتمان</span>
                                </label>
                            </div>

                            {/* نموذج البطاقة */}
                            {formData.payment.method === 'credit_card' && (
                                <div className="card-form">
                                    <div className="form-group">
                                        <label>رقم البطاقة *</label>
                                        <input
                                            type="text"
                                            placeholder="1234 5678 9012 3456"
                                            value={formData.payment.cardNumber}
                                            onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
                                            maxLength="19"
                                        />
                                    </div>
                                    
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>تاريخ الانتهاء *</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={formData.payment.expiryDate}
                                                onChange={(e) => handleInputChange('payment', 'expiryDate', e.target.value)}
                                                maxLength="5"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>CVV *</label>
                                            <input
                                                type="text"
                                                placeholder="123"
                                                value={formData.payment.cvv}
                                                onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                                                maxLength="3"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>اسم حامل البطاقة *</label>
                                        <input
                                            type="text"
                                            placeholder="كما هو مدون على البطاقة"
                                            value={formData.payment.cardholderName}
                                            onChange={(e) => handleInputChange('payment', 'cardholderName', e.target.value)}
                                        />
                                    </div>
                                    
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.payment.saveCard}
                                            onChange={(e) => handleInputChange('payment', 'saveCard', e.target.checked)}
                                        />
                                        <span>حفظ البطاقة للمرات القادمة (مشفر)</span>
                                    </label>
                                </div>
                            )}

                            {/* معلومات الأمان */}
                            <div className="payment-security">
                                <div className="security-features">
                                    <div className="security-feature">
                                        <span className="feature-icon">🔒</span>
                                        <span>تشفير SSL 256-bit</span>
                                    </div>
                                    <div className="security-feature">
                                        <span className="feature-icon">🛡️</span>
                                        <span>متوافق مع PCI DSS</span>
                                    </div>
                                    <div className="security-feature">
                                        <span className="feature-icon">👁️</span>
                                        <span>لا نخزن بيانات بطاقتك</span>
                                    </div>
                                </div>
                            </div>

                            {/* أزرار التنقل */}
                            <div className="step-actions">
                                <button 
                                    onClick={prevStep}
                                    className="btn btn-secondary"
                                >
                                    ← العودة للشحن
                                </button>
                                <button 
                                    onClick={nextStep}
                                    className="btn btn-primary"
                                >
                                    التالي → مراجعة الطلب
                                </button>
                            </div>
                        </div>
                    )}

                    {/* الخطوة 3: مراجعة الطلب */}
                    {step === 3 && (
                        <div className="checkout-step">
                            <h2>مراجعة الطلب</h2>
                            
                            <div className="review-sections">
                                {/* معلومات الشحن */}
                                <div className="review-section">
                                    <h3>معلومات الشحن</h3>
                                    <div className="review-content">
                                        <p><strong>الاسم:</strong> {formData.shipping.firstName} {formData.shipping.lastName}</p>
                                        <p><strong>البريد الإلكتروني:</strong> {formData.shipping.email}</p>
                                        <p><strong>الهاتف:</strong> {formData.shipping.phone}</p>
                                        <p><strong>العنوان:</strong> {formData.shipping.address}, {formData.shipping.city}, {formData.shipping.postalCode}</p>
                                        <p><strong>طريقة الشحن:</strong> {formData.shippingMethod === 'express' ? 'سريع' : 'عادي'}</p>
                                    </div>
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="edit-btn"
                                    >
                                        تعديل
                                    </button>
                                </div>

                                {/* طريقة الدفع */}
                                <div className="review-section">
                                    <h3>طريقة الدفع</h3>
                                    <div className="review-content">
                                        <p><strong>الطريقة:</strong> بطاقة ائتمان</p>
                                        <p><strong>رقم البطاقة:</strong> **** **** **** {formData.payment.cardNumber.slice(-4)}</p>
                                    </div>
                                    <button 
                                        onClick={() => setStep(2)}
                                        className="edit-btn"
                                    >
                                        تعديل
                                    </button>
                                </div>

                                {/* ملخص الطلب */}
                                <div className="review-section">
                                    <h3>ملخص الطلب</h3>
                                    <div className="order-summary">
                                        <div className="summary-row">
                                            <span>المجموع الفرعي:</span>
                                            <span>{calculateSubtotal().toLocaleString()} ر.س</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>رسوم الشحن:</span>
                                            <span>{calculateShipping().toLocaleString()} ر.س</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>الضريبة:</span>
                                            <span>{calculateTax().toLocaleString()} ر.س</span>
                                        </div>
                                        <div className="summary-divider"></div>
                                        <div className="summary-row total">
                                            <span>الإجمالي:</span>
                                            <span>{calculateTotal().toLocaleString()} ر.س</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ملاحظات الطلب */}
                            <div className="order-notes">
                                <label>ملاحظات الطلب (اختياري)</label>
                                <textarea
                                    value={formData.orderNotes}
                                    onChange={(e) => setFormData(prev => ({...prev, orderNotes: e.target.value}))}
                                    placeholder="أي ملاحظات إضافية للطلب..."
                                    rows="3"
                                />
                            </div>

                            {/* اتفاقية الشروط */}
                            <div className="terms-agreement">
                                <label className="checkbox-label">
                                    <input type="checkbox" required />
                                    <span>أوافق على <a href="/terms" target="_blank">الشروط والأحكام</a> و <a href="/privacy" target="_blank">سياسة الخصوصية</a></span>
                                </label>
                            </div>

                            {/* أزرار الإجراء */}
                            <div className="step-actions">
                                <button 
                                    onClick={prevStep}
                                    className="btn btn-secondary"
                                >
                                    ← العودة للدفع
                                </button>
                                <button 
                                    onClick={handlePayment}
                                    disabled={processing}
                                    className="btn btn-primary btn-large"
                                >
                                    {processing ? (
                                        <>
                                            <LoadingSpinner size="small" />
                                            جاري معالجة الدفع...
                                        </>
                                    ) : (
                                        '✅ تأكيد الطلب والدفع'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Checkout;