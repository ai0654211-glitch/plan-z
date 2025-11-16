import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ProductGallery from '../../components/products/ProductGallery.jsx';
import ProductReviews from '../../components/products/ProductReviews.jsx';
import SecurityBadge from '../../components/common/SecurityBadge.jsx';
import './ProductDetails.css';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);

    // تحميل بيانات المنتج
    useEffect(() => {
        const loadProduct = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    throw new Error('معرف المنتج غير صالح');
                }

                const response = await productsAPI.getProduct(id);

                if (response.data.success) {
                    setProduct(response.data.product);
                    
                    // تحديد المتغير الافتراضي
                    if (response.data.product.variants?.length > 0) {
                        setSelectedVariant(response.data.product.variants[0]);
                    }

                    FrontendSecurity.logSecurityEvent('PRODUCT_DETAILS_VIEWED', {
                        productId: id,
                        productName: response.data.product.name
                    });
                } else {
                    throw new Error('فشل في تحميل بيانات المنتج');
                }
            } catch (err) {
                const errorMessage = err.response?.data?.error || 'تعذر تحميل المنتج';
                setError(errorMessage);
                
                FrontendSecurity.logSecurityEvent('PRODUCT_DETAILS_ERROR', {
                    productId: id,
                    error: errorMessage
                });
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id]);

    // إضافة إلى السلة
    const handleAddToCart = () => {
        if (!isAuthenticated) {
            navigate('/login', { 
                state: { from: `/products/${id}` } 
            });
            return;
        }

        // هنا سيتم تنفيذ إضافة إلى السلة
        FrontendSecurity.logSecurityEvent('PRODUCT_ADDED_TO_CART', {
            productId: id,
            quantity,
            variant: selectedVariant
        });

        // عرض رسالة نجاح
        alert('تمت إضافة المنتج إلى السلة بنجاح!');
    };

    // الشراء المباشر
    const handleBuyNow = () => {
        if (!isAuthenticated) {
            navigate('/login', { 
                state: { from: `/products/${id}` } 
            });
            return;
        }

        // إضافة إلى السلة ثم التوجه للدفع
        handleAddToCart();
        navigate('/checkout');
    };

    if (loading) {
        return (
            <div className="product-details-loading">
                <LoadingSpinner size="large" />
                <p>جاري تحميل بيانات المنتج الآمنة...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="product-details-error">
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h2>تعذر تحميل المنتج</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button 
                            onClick={() => navigate('/products')} 
                            className="btn btn-primary"
                        >
                            العودة للمنتجات
                        </button>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn btn-secondary"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-not-found">
                <div className="not-found-container">
                    <div className="not-found-icon">❓</div>
                    <h2>المنتج غير موجود</h2>
                    <p>المنتج الذي تبحث عنه غير متوفر أو تم إزالته.</p>
                    <button 
                        onClick={() => navigate('/products')} 
                        className="btn btn-primary"
                    >
                        استكشاف المنتجات
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="product-details-page">
            <div className="container">
                {/* مسار التنقل */}
                <nav className="breadcrumb">
                    <a href="/">الرئيسية</a>
                    <span className="separator">/</span>
                    <a href="/products">المنتجات</a>
                    <span className="separator">/</span>
                    <span className="current">{product.name}</span>
                </nav>

                {/* المحتوى الرئيسي */}
                <div className="product-details-layout">
                    {/* معرض الصور */}
                    <div className="product-gallery-section">
                        <ProductGallery 
                            images={product.media?.images || []}
                            videos={product.media?.videos || []}
                            productName={product.name}
                        />
                    </div>

                    {/* معلومات المنتج */}
                    <div className="product-info-section">
                        <SecurityBadge level="high" />
                        
                        <div className="product-header">
                            <h1 className="product-title">{product.name}</h1>
                            <div className="product-meta">
                                <span className="product-sku">
                                    SKU: {product.inventory?.sku || 'N/A'}
                                </span>
                                <span className={`product-status ${product.status}`}>
                                    {product.status === 'active' ? '🟢 متوفر' : 
                                     product.status === 'out_of_stock' ? '🔴 غير متوفر' : 
                                     '🟡 مسودة'}
                                </span>
                            </div>
                        </div>

                        {/* التقييمات */}
                        <div className="product-ratings">
                            <div className="rating-stars">
                                {'★'.repeat(Math.floor(product.ratings?.average || 0))}
                                {'☆'.repeat(5 - Math.floor(product.ratings?.average || 0))}
                            </div>
                            <span className="rating-value">
                                {product.ratings?.average?.toFixed(1) || '0.0'}
                            </span>
                            <span className="rating-count">
                                ({product.ratings?.count || 0} تقييم)
                            </span>
                        </div>

                        {/* السعر */}
                        <div className="product-pricing">
                            <span className="current-price">
                                {product.pricing?.price?.toLocaleString()} ر.س
                            </span>
                            {product.pricing?.comparePrice && 
                             product.pricing.comparePrice > product.pricing.price && (
                                <>
                                    <span className="original-price">
                                        {product.pricing.comparePrice.toLocaleString()} ر.س
                                    </span>
                                    <span className="discount-badge">
                                        خصم {product.discountPercentage}%
                                    </span>
                                </>
                            )}
                        </div>

                        {/* الوصف */}
                        <div className="product-description">
                            <h3>وصف المنتج</h3>
                            <p>{product.description}</p>
                        </div>

                        {/* المتغيرات */}
                        {product.variants?.length > 0 && (
                            <div className="product-variants">
                                <h4>المتغيرات المتاحة:</h4>
                                <div className="variants-list">
                                    {product.variants.map((variant, index) => (
                                        <button
                                            key={index}
                                            className={`variant-btn ${
                                                selectedVariant === variant ? 'active' : ''
                                            }`}
                                            onClick={() => setSelectedVariant(variant)}
                                        >
                                            {variant.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* الكمية والإجراءات */}
                        <div className="product-actions">
                            <div className="quantity-selector">
                                <label htmlFor="quantity">الكمية:</label>
                                <div className="quantity-controls">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        className="quantity-btn"
                                    >
                                        -
                                    </button>
                                    <input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        max={product.inventory?.quantity || 10}
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="quantity-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(prev => prev + 1)}
                                        className="quantity-btn"
                                    >
                                        +
                                    </button>
                                </div>
                                <span className="stock-info">
                                    {product.inventory?.quantity || 0} وحدة متاحة
                                </span>
                            </div>

                            <div className="action-buttons">
                                <button
                                    onClick={handleAddToCart}
                                    className="btn btn-secondary btn-large"
                                    disabled={!product.isInStock}
                                >
                                    🛒 إضافة إلى السلة
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    className="btn btn-primary btn-large"
                                    disabled={!product.isInStock}
                                >
                                    💳 شراء الآن
                                </button>
                            </div>
                        </div>

                        {/* معلومات الشحن والأمان */}
                        <div className="product-features">
                            <div className="feature">
                                <span className="feature-icon">🚚</span>
                                <span>شحن سريع خلال 2-3 أيام</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">↩️</span>
                                <span>إرجاع مجاني خلال 14 يوم</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">🔒</span>
                                <span>دفع آمن ومشفر</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* التقييمات والمراجعات */}
                <div className="product-reviews-section">
                    <ProductReviews 
                        productId={id}
                        ratings={product.ratings}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;