import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import { productsAPI } from '../../services/api.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import SecurityBadge from '../../components/common/SecurityBadge.jsx';
import './Cart.css';

const Cart = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');

    // تحميل عناصر السلة
    useEffect(() => {
        if (isAuthenticated) {
            loadCartItems();
        } else {
            setLoading(false);
            // يمكن تحميل السلة من التخزين المحلي للزوار
            loadGuestCart();
        }
    }, [isAuthenticated]);

    // تحميل سلة المستخدم المسجل
    const loadCartItems = async () => {
        try {
            setLoading(true);
            // هنا سيتم جلب عناصر السلة من API
            // مؤقتاً: بيانات تجريبية
            const mockCartItems = [
                {
                    id: '1',
                    product: {
                        _id: 'prod1',
                        name: 'هاتف ذكي متطور',
                        pricing: { price: 2500 },
                        media: { images: [{ url: '/images/phone.jpg' }] },
                        inventory: { quantity: 10 }
                    },
                    quantity: 1,
                    variant: null
                },
                {
                    id: '2', 
                    product: {
                        _id: 'prod2',
                        name: 'سماعات لاسلكية',
                        pricing: { price: 300 },
                        media: { images: [{ url: '/images/headphones.jpg' }] },
                        inventory: { quantity: 5 }
                    },
                    quantity: 2,
                    variant: { name: 'لون', option: 'أسود' }
                }
            ];
            
            setCartItems(mockCartItems);
            
            FrontendSecurity.logSecurityEvent('CART_LOADED', {
                userId: user?.id,
                itemCount: mockCartItems.length
            });
            
        } catch (error) {
            setError('فشل في تحميل سلة التسوق');
            FrontendSecurity.logSecurityEvent('CART_LOAD_ERROR', {
                error: error.message,
                userId: user?.id
            });
        } finally {
            setLoading(false);
        }
    };

    // تحميل سلة الزائر
    const loadGuestCart = () => {
        try {
            const guestCart = FrontendSecurity.secureGetItem('guest_cart') || [];
            setCartItems(guestCart);
        } catch (error) {
            console.error('Error loading guest cart:', error);
        }
    };

    // تحديث كمية المنتج
    const updateQuantity = async (itemId, newQuantity) => {
        if (newQuantity < 1) return;
        
        try {
            setUpdating(true);
            
            const updatedItems = cartItems.map(item =>
                item.id === itemId 
                    ? { ...item, quantity: newQuantity }
                    : item
            );
            
            setCartItems(updatedItems);
            
            // حفظ في التخزين المناسب
            if (isAuthenticated) {
                // تحديث في API
            } else {
                FrontendSecurity.secureSetItem('guest_cart', updatedItems);
            }
            
            FrontendSecurity.logSecurityEvent('CART_ITEM_UPDATED', {
                itemId,
                newQuantity,
                userId: user?.id
            });
            
        } catch (error) {
            setError('فشل في تحديث الكمية');
        } finally {
            setUpdating(false);
        }
    };

    // إزالة منتج من السلة
    const removeItem = async (itemId) => {
        try {
            const updatedItems = cartItems.filter(item => item.id !== itemId);
            setCartItems(updatedItems);
            
            if (isAuthenticated) {
                // حذف من API
            } else {
                FrontendSecurity.secureSetItem('guest_cart', updatedItems);
            }
            
            FrontendSecurity.logSecurityEvent('CART_ITEM_REMOVED', {
                itemId,
                userId: user?.id
            });
            
        } catch (error) {
            setError('فشل في إزالة المنتج');
        }
    };

    // المتابعة للدفع
    const proceedToCheckout = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/cart' } });
            return;
        }

        if (cartItems.length === 0) {
            setError('السلة فارغة');
            return;
        }

        FrontendSecurity.logSecurityEvent('CHECKOUT_INITIATED', {
            userId: user?.id,
            itemCount: cartItems.length,
            total: calculateTotal()
        });

        navigate('/checkout');
    };

    // الحسابات
    const calculateSubtotal = () => {
        return cartItems.reduce((total, item) => {
            return total + (item.product.pricing.price * item.quantity);
        }, 0);
    };

    const calculateShipping = () => {
        return 15; // رسوم شحن ثابتة مؤقتاً
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.15; // ضريبة 15%
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateShipping() + calculateTax();
    };

    if (loading) {
        return (
            <div className="cart-loading">
                <LoadingSpinner 
                    size="large" 
                    text="جاري تحميل سلة التسوق الآمنة..."
                />
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="container">
                {/* رأس الصفحة */}
                <div className="page-header">
                    <h1 className="page-title">سلة التسوق</h1>
                    <SecurityBadge level="high" />
                    
                    {!isAuthenticated && (
                        <div className="guest-notice">
                            <p>أنت تتسوق كزائر. <Link to="/login">سجل الدخول</Link> لحفظ سلة التسوق.</p>
                        </div>
                    )}
                </div>

                {/* رسالة الخطأ */}
                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                {/* محتوى السلة */}
                <div className="cart-layout">
                    {/* عناصر السلة */}
                    <div className="cart-items-section">
                        {cartItems.length === 0 ? (
                            <div className="empty-cart">
                                <div className="empty-icon">🛒</div>
                                <h3>سلة التسوق فارغة</h3>
                                <p>لم تقم بإضافة أي منتجات إلى سلة التسوق بعد.</p>
                                <Link to="/products" className="btn btn-primary">
                                    ابدأ التسوق
                                </Link>
                            </div>
                        ) : (
                            <div className="cart-items">
                                <div className="cart-header">
                                    <h2>عناصر السلة ({cartItems.length})</h2>
                                    <div className="security-status">
                                        <span className="status-badge secure">🔒 آمن</span>
                                    </div>
                                </div>

                                {cartItems.map((item) => (
                                    <div key={item.id} className="cart-item">
                                        {/* صورة المنتج */}
                                        <div className="item-image">
                                            <img 
                                                src={item.product.media.images[0]?.url || '/images/placeholder.jpg'} 
                                                alt={item.product.name}
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* معلومات المنتج */}
                                        <div className="item-details">
                                            <h4 className="product-name">
                                                <Link to={`/products/${item.product._id}`}>
                                                    {item.product.name}
                                                </Link>
                                            </h4>
                                            
                                            {item.variant && (
                                                <div className="variant-info">
                                                    <span>{item.variant.name}: {item.variant.option}</span>
                                                </div>
                                            )}
                                            
                                            <div className="stock-info">
                                                {item.product.inventory.quantity > 0 ? (
                                                    <span className="in-stock">✅ متوفر</span>
                                                ) : (
                                                    <span className="out-of-stock">🔴 غير متوفر</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* السعر */}
                                        <div className="item-pricing">
                                            <div className="price">
                                                {item.product.pricing.price.toLocaleString()} ر.س
                                            </div>
                                            <div className="total-price">
                                                الإجمالي: {(item.product.pricing.price * item.quantity).toLocaleString()} ر.س
                                            </div>
                                        </div>

                                        {/* التحكم في الكمية */}
                                        <div className="quantity-controls">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1 || updating}
                                                className="quantity-btn"
                                            >
                                                -
                                            </button>
                                            <span className="quantity-display">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={updating}
                                                className="quantity-btn"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* إزالة المنتج */}
                                        <div className="item-actions">
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                disabled={updating}
                                                className="remove-btn"
                                                title="إزالة من السلة"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ملخص الطلب */}
                    {cartItems.length > 0 && (
                        <div className="order-summary-section">
                            <div className="order-summary">
                                <h3 className="summary-title">ملخص الطلب</h3>
                                
                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>المجموع الفرعي:</span>
                                        <span>{calculateSubtotal().toLocaleString()} ر.س</span>
                                    </div>
                                    
                                    <div className="summary-row">
                                        <span>رسوم الشحن:</span>
                                        <span>{calculateShipping().toLocaleString()} ر.س</span>
                                    </div>
                                    
                                    <div className="summary-row">
                                        <span>الضريبة (15%):</span>
                                        <span>{calculateTax().toLocaleString()} ر.س</span>
                                    </div>
                                    
                                    <div className="summary-divider"></div>
                                    
                                    <div className="summary-row total">
                                        <span>الإجمالي:</span>
                                        <span>{calculateTotal().toLocaleString()} ر.س</span>
                                    </div>
                                </div>

                                {/* معلومات الأمان */}
                                <div className="security-info">
                                    <div className="security-feature">
                                        <span className="feature-icon">🔒</span>
                                        <span>دفع آمن ومشفر</span>
                                    </div>
                                    <div className="security-feature">
                                        <span className="feature-icon">🛡️</span>
                                        <span>بياناتك محمية</span>
                                    </div>
                                </div>

                                {/* زر المتابعة */}
                                <button
                                    onClick={proceedToCheckout}
                                    className="btn btn-primary btn-large btn-block checkout-btn"
                                >
                                    💳 المتابعة للدفع الآمن
                                </button>

                                {/* روابط إضافية */}
                                <div className="summary-links">
                                    <Link to="/products" className="continue-shopping">
                                        ← متابعة التسوق
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* توصيات المنتجات */}
                {cartItems.length > 0 && (
                    <div className="cart-recommendations">
                        <h3>منتجات قد تعجبك</h3>
                        <div className="recommendations-grid">
                            {/* سيتم عرض منتجات مقترحة هنا */}
                            <div className="recommendation-placeholder">
                                <p>سيتم عرض منتجات مقترحة قريباً...</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;