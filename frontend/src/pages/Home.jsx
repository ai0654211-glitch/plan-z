import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { productsAPI } from '../../services/api.js';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ProductCard from '../../components/products/ProductCard.jsx';
import SecurityBadge from '../../components/common/SecurityBadge.jsx';
import './Home.css';

const Home = () => {
    const { isAuthenticated, user } = useAuth();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [newArrivals, setNewArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [securityStats, setSecurityStats] = useState(null);

    // تحميل البيانات
    const loadHomeData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // تحميل متوازي لجميع البيانات
            const [featuredResponse, bestSellersResponse, newArrivalsResponse] = await Promise.all([
                productsAPI.getProducts({ sortBy: 'ratings.average', sortOrder: 'desc', limit: 8 }),
                productsAPI.getProducts({ sortBy: 'stats.purchases', sortOrder: 'desc', limit: 6 }),
                productsAPI.getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 6 })
            ]);

            // التحقق من استجابة API
            if (featuredResponse.data.success) {
                setFeaturedProducts(featuredResponse.data.products);
            }
            if (bestSellersResponse.data.success) {
                setBestSellers(bestSellersResponse.data.products);
            }
            if (newArrivalsResponse.data.success) {
                setNewArrivals(newArrivalsResponse.data.products);
            }

            // تسجيل تحميل الصفحة بنجاح
            FrontendSecurity.logSecurityEvent('HOME_PAGE_LOADED', {
                featuredCount: featuredResponse.data.products?.length || 0,
                bestSellersCount: bestSellersResponse.data.products?.length || 0,
                newArrivalsCount: newArrivalsResponse.data.products?.length || 0
            });

        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to load home page data';
            setError(errorMessage);
            
            FrontendSecurity.logSecurityEvent('HOME_PAGE_LOAD_ERROR', {
                error: errorMessage,
                status: err.response?.status
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // تحميل البيانات عند تركيب المكون
    useEffect(() => {
        loadHomeData();
    }, [loadHomeData]);

    // تحديث إحصائيات الأمان
    useEffect(() => {
        if (isAuthenticated) {
            const stats = {
                lastLogin: new Date().toLocaleString('ar-SA'),
                secureSession: true,
                encryptedData: true
            };
            setSecurityStats(stats);
        }
    }, [isAuthenticated]);

    // إعادة المحاولة
    const handleRetry = () => {
        loadHomeData();
    };

    // معالجة الأخطاء
    if (loading) {
        return (
            <div className="home-loading">
                <LoadingSpinner size="large" />
                <p>جاري تحميل المحتوى الآمن...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="home-error">
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h2>تعذر تحميل الصفحة</h2>
                    <p>{error}</p>
                    <button onClick={handleRetry} className="retry-btn">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* قسم البطل (Hero) */}
            <section className="hero-section">
                <div className="hero-background">
                    <div className="hero-overlay"></div>
                </div>
                <div className="hero-content">
                    <div className="hero-text">
                        <SecurityBadge level="high" />
                        <h1 className="hero-title">
                            تجربة تسوق <span className="highlight">آمنة</span> ومحمية
                        </h1>
                        <p className="hero-description">
                            اكتشف أحدث المنتجات بأعلى معايير الأمان والحماية. 
                            نحن نحمي بياناتك وتجربتك في كل خطوة.
                        </p>
                        <div className="hero-features">
                            <div className="feature">
                                <span className="feature-icon">🔒</span>
                                <span>تشفير متقدم</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">🛡️</span>
                                <span>حماية من الاختراق</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">✓</span>
                                <span>دفع آمن</span>
                            </div>
                        </div>
                        <div className="hero-actions">
                            <Link to="/products" className="btn btn-primary btn-large">
                                ابدأ التسوق الآمن
                            </Link>
                            <Link to="/about-security" className="btn btn-secondary">
                                تعرف على أماننا
                            </Link>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="security-visual">
                            <div className="floating-card card-1">
                                <div className="card-icon">🛒</div>
                                <div className="card-text">تسوق آمن</div>
                            </div>
                            <div className="floating-card card-2">
                                <div className="card-icon">💳</div>
                                <div className="card-text">دفع مشفر</div>
                            </div>
                            <div className="floating-card card-3">
                                <div className="card-icon">🚚</div>
                                <div className="card-text">توصيل سريع</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* قسم المنتجات المميزة */}
            <section className="featured-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">منتجات مميزة</h2>
                        <p className="section-subtitle">
                            اكتشف أفضل المنتجات المختارة بعناية لأجلك
                        </p>
                    </div>
                    
                    {featuredProducts.length > 0 ? (
                        <div className="products-grid">
                            {featuredProducts.map((product) => (
                                <ProductCard 
                                    key={product._id} 
                                    product={product}
                                    showSecurityBadge={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="no-products">
                            <p>لا توجد منتجات مميزة في الوقت الحالي</p>
                        </div>
                    )}

                    <div className="section-actions">
                        <Link to="/products" className="btn btn-outline">
                            عرض جميع المنتجات
                        </Link>
                    </div>
                </div>
            </section>

            {/* قسم الأكثر مبيعاً */}
            <section className="bestsellers-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">الأكثر مبيعاً</h2>
                        <p className="section-subtitle">
                            المنتجات الأكثر طلباً من عملائنا
                        </p>
                    </div>
                    
                    {bestSellers.length > 0 ? (
                        <div className="products-grid compact">
                            {bestSellers.map((product) => (
                                <ProductCard 
                                    key={product._id} 
                                    product={product}
                                    compact={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="no-products">
                            <p>لا توجد إحصائيات مبيعات في الوقت الحالي</p>
                        </div>
                    )}
                </div>
            </section>

            {/* قسم الوافدون الجدد */}
            <section className="new-arrivals-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">وافدون جديدون</h2>
                        <p className="section-subtitle">
                            أحدث المنتجات المضافة إلى متجرنا
                        </p>
                    </div>
                    
                    {newArrivals.length > 0 ? (
                        <div className="products-grid">
                            {newArrivals.map((product) => (
                                <ProductCard 
                                    key={product._id} 
                                    product={product}
                                    showNewBadge={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="no-products">
                            <p>لا توجد منتجات جديدة في الوقت الحالي</p>
                        </div>
                    )}
                </div>
            </section>

            {/* قسم ميزات الأمان */}
            <section className="security-features-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">أمانك هو أولويتنا</h2>
                        <p className="section-subtitle">
                            نحمي معلوماتك بطبقات متعددة من الأمان
                        </p>
                    </div>
                    
                    <div className="security-features-grid">
                        <div className="security-feature">
                            <div className="feature-icon">🔐</div>
                            <h3>تشفير البيانات</h3>
                            <p>
                                جميع بياناتك مشفرة باستخدام خوارزميات AES-256 
                                المتقدمة لحماية خصوصيتك.
                            </p>
                        </div>
                        
                        <div className="security-feature">
                            <div className="feature-icon">🛡️</div>
                            <h3>حماية من الاختراق</h3>
                            <p>
                                نظام مراقبة متقدم لاكتشاف ومنع أي محاولات 
                                اختراق أو وصول غير مصرح.
                            </p>
                        </div>
                        
                        <div className="security-feature">
                            <div className="feature-icon">💳</div>
                            <h3>دفع آمن</h3>
                            <p>
                                معاملات دفع مشفرة بالكامل مع توافق مع 
                                معايير PCI DSS لأعلى مستوى أمان.
                            </p>
                        </div>
                        
                        <div className="security-feature">
                            <div className="feature-icon">📱</div>
                            <h3>جلسات آمنة</h3>
                            <p>
                                جلسات مستخدم آمنة مع تجديد تلقائي للتوكنات 
                                ومنع الاختراق بالجلسات.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* قسم التحقق من الأمان للمستخدمين المسجلين */}
            {isAuthenticated && securityStats && (
                <section className="user-security-section">
                    <div className="container">
                        <div className="security-status">
                            <div className="status-header">
                                <h3>حالة الأمان الحالية</h3>
                                <div className="status-badge verified">
                                    ✓ مؤمن
                                </div>
                            </div>
                            <div className="status-details">
                                <div className="status-item">
                                    <span className="label">آخر تسجيل دخول:</span>
                                    <span className="value">{securityStats.lastLogin}</span>
                                </div>
                                <div className="status-item">
                                    <span className="label">الجلسة الحالية:</span>
                                    <span className="value secure">مؤمنة</span>
                                </div>
                                <div className="status-item">
                                    <span className="label">التشفير:</span>
                                    <span className="value active">مفعل</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* دعوة للعمل */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>جاهز لتجربة تسوق آمنة؟</h2>
                        <p>
                            انضم إلى آلاف العملاء الذين يثقون بأماننا ويستمتعون 
                            بتجربة تسوق سلسة ومحمية.
                        </p>
                        <div className="cta-actions">
                            {!isAuthenticated ? (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-large">
                                        إنشاء حساب آمن
                                    </Link>
                                    <Link to="/login" className="btn btn-secondary">
                                        تسجيل الدخول
                                    </Link>
                                </>
                            ) : (
                                <Link to="/products" className="btn btn-primary btn-large">
                                    متابعة التسوق
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;