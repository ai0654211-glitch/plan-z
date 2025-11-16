import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import './ProductCard.css';

const ProductCard = ({ 
    product, 
    compact = false,
    showSecurityBadge = false,
    showNewBadge = false 
}) => {
    const { isAuthenticated } = useAuth();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!product) {
        return null;
    }

    // معالجة تحميل الصورة
    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    const handleImageError = () => {
        setImageError(true);
        setImageLoaded(true);
    };

    // إضافة إلى المفضلة
    const handleAddToWishlist = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            // توجيه لصفحة تسجيل الدخول
            return;
        }

        FrontendSecurity.logSecurityEvent('PRODUCT_ADDED_TO_WISHLIST', {
            productId: product._id,
            productName: product.name
        });

        // تنفيذ إضافة للمفضلة
    };

    // مشاركة المنتج
    const handleShareProduct = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: product.description,
                url: window.location.origin + '/products/' + product._id
            }).catch(() => {
                // Fallback for sharing
                FrontendSecurity.logSecurityEvent('PRODUCT_SHARED', {
                    productId: product._id
                });
            });
        }
    };

    // الحصول على الصورة الرئيسية
    const getMainImage = () => {
        if (product.media?.images?.length > 0) {
            const primaryImage = product.media.images.find(img => img.isPrimary);
            return primaryImage?.url || product.media.images[0]?.url;
        }
        return '/images/placeholder-product.jpg';
    };

    return (
        <div className={`product-card ${compact ? 'compact' : ''}`}>
            <Link 
                to={`/products/${product._id}`} 
                className="product-card-link"
            >
                {/* صورة المنتج */}
                <div className="product-image-container">
                    {!imageLoaded && (
                        <div className="image-placeholder">
                            <div className="loading-spinner"></div>
                        </div>
                    )}
                    
                    <img
                        src={imageError ? '/images/placeholder-product.jpg' : getMainImage()}
                        alt={product.name}
                        className={`product-image ${imageLoaded ? 'loaded' : 'loading'}`}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        loading="lazy"
                    />

                    {/* شارات المنتج */}
                    <div className="product-badges">
                        {showNewBadge && product.status === 'active' && (
                            <span className="badge new-badge">🆕 جديد</span>
                        )}
                        
                        {product.pricing?.comparePrice && 
                         product.pricing.comparePrice > product.pricing.price && (
                            <span className="badge discount-badge">
                                خصم {product.discountPercentage}%
                            </span>
                        )}
                        
                        {!product.isInStock && (
                            <span className="badge out-of-stock-badge">🔴 غير متوفر</span>
                        )}

                        {showSecurityBadge && (
                            <span className="badge security-badge">🔒 آمن</span>
                        )}
                    </div>

                    {/* أزرار الإجراءات السريعة */}
                    <div className="product-actions">
                        <button
                            className="action-btn wishlist-btn"
                            onClick={handleAddToWishlist}
                            title="إضافة إلى المفضلة"
                        >
                            ♡
                        </button>
                        <button
                            className="action-btn share-btn"
                            onClick={handleShareProduct}
                            title="مشاركة المنتج"
                        >
                            ↷
                        </button>
                    </div>
                </div>

                {/* معلومات المنتج */}
                <div className="product-info">
                    {/* التصنيفات */}
                    {product.categories?.length > 0 && !compact && (
                        <div className="product-categories">
                            {product.categories.slice(0, 2).map((category, index) => (
                                <span key={index} className="category-tag">
                                    {category.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* اسم المنتج */}
                    <h3 className="product-title">{product.name}</h3>

                    {/* الوصف (في الوضع العادي فقط) */}
                    {!compact && product.description && (
                        <p className="product-description">
                            {product.description.length > 100 
                                ? product.description.substring(0, 100) + '...'
                                : product.description
                            }
                        </p>
                    )}

                    {/* التقييمات */}
                    <div className="product-ratings">
                        <div className="rating-stars">
                            {'★'.repeat(Math.floor(product.ratings?.average || 0))}
                            {'☆'.repeat(5 - Math.floor(product.ratings?.average || 0))}
                        </div>
                        <span className="rating-value">
                            ({product.ratings?.count || 0})
                        </span>
                    </div>

                    {/* السعر */}
                    <div className="product-pricing">
                        <span className="current-price">
                            {product.pricing?.price?.toLocaleString()} ر.س
                        </span>
                        {product.pricing?.comparePrice && 
                         product.pricing.comparePrice > product.pricing.price && (
                            <span className="original-price">
                                {product.pricing.comparePrice.toLocaleString()} ر.س
                            </span>
                        )}
                    </div>

                    {/* معلومات المخزون */}
                    <div className="product-stock">
                        {product.isInStock ? (
                            <span className="in-stock">
                                ✅ {product.inventory?.quantity || 'متوفر'}
                            </span>
                        ) : (
                            <span className="out-of-stock">
                                🔴 غير متوفر
                            </span>
                        )}
                    </div>

                    {/* إحصائيات إضافية */}
                    {!compact && (
                        <div className="product-stats">
                            <span className="stat">
                                👁️ {product.stats?.views || 0}
                            </span>
                            <span className="stat">
                                💰 {product.stats?.purchases || 0}
                            </span>
                        </div>
                    )}
                </div>

                {/* زر سريع للإضافة إلى السلة (في الوضع المدمج) */}
                {compact && product.isInStock && (
                    <div className="quick-action">
                        <button 
                            className="btn btn-primary btn-small"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // إضافة إلى السلة
                            }}
                        >
                            🛒 إضافة
                        </button>
                    </div>
                )}
            </Link>

            {/* طبقة الأمان */}
            <div className="security-layer">
                {/* يمكن إضافة عناصر أمان إضافية هنا */}
            </div>
        </div>
    );
};

export default ProductCard;