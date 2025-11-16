import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../../services/api.js';
import { FrontendSecurity } from '../../utils/security.js';
import ProductCard from '../../components/products/ProductCard.jsx';
import ProductFilter from '../../components/products/ProductFilter.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import './Products.css';

const Products = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({});
    
    // حالة الفلاتر
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        inStock: searchParams.get('inStock') || '',
        rating: searchParams.get('rating') || '',
        search: searchParams.get('search') || '',
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc'
    });

    // تحميل المنتجات
    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // تنظيف الفلاتر
            const cleanFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value !== '')
            );

            const response = await productsAPI.getProducts(cleanFilters);

            if (response.data.success) {
                setProducts(response.data.products);
                setPagination(response.data.pagination);
                
                FrontendSecurity.logSecurityEvent('PRODUCTS_LOADED', {
                    count: response.data.products.length,
                    filters: cleanFilters
                });
            } else {
                throw new Error('Failed to load products');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'فشل في تحميل المنتجات';
            setError(errorMessage);
            
            FrontendSecurity.logSecurityEvent('PRODUCTS_LOAD_ERROR', {
                error: errorMessage,
                filters
            });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // تحديث URL عند تغيير الفلاتر
    useEffect(() => {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });
        
        setSearchParams(params);
    }, [filters, setSearchParams]);

    // تحميل المنتجات عند تغيير الفلاتر
    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // معالجة تغيير الفلاتر
    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // إعادة تعيين الفلاتر
    const handleResetFilters = () => {
        setFilters({
            category: '',
            minPrice: '',
            maxPrice: '',
            inStock: '',
            rating: '',
            search: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
    };

    if (loading) {
        return (
            <div className="products-loading">
                <LoadingSpinner size="large" />
                <p>جاري تحميل المنتجات الآمنة...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="products-error">
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h2>تعذر تحميل المنتجات</h2>
                    <p>{error}</p>
                    <button onClick={loadProducts} className="retry-btn">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="products-page">
            <div className="container">
                {/* رأس الصفحة */}
                <div className="page-header">
                    <h1 className="page-title">منتجاتنا</h1>
                    <p className="page-subtitle">
                        اكتشف مجموعة منتجاتنا المختارة بعناية
                    </p>
                    
                    {filters.search && (
                        <div className="search-results-info">
                            <p>
                                نتائج البحث عن: "<strong>{filters.search}</strong>"
                                {products.length > 0 && ` - ${products.length} منتج`}
                            </p>
                        </div>
                    )}
                </div>

                {/* المحتوى الرئيسي */}
                <div className="products-layout">
                    {/* الشريط الجانبي للفلاتر */}
                    <aside className="filters-sidebar">
                        <ProductFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetFilters}
                        />
                    </aside>

                    {/* منطقة المنتجات */}
                    <main className="products-main">
                        {/* شريط التحكم */}
                        <div className="products-controls">
                            <div className="results-count">
                                <span>
                                    عرض {products.length} من أصل {pagination.total} منتج
                                </span>
                            </div>
                            
                            <div className="sort-controls">
                                <select
                                    value={`${filters.sortBy}-${filters.sortOrder}`}
                                    onChange={(e) => {
                                        const [sortBy, sortOrder] = e.target.value.split('-');
                                        handleFilterChange({ sortBy, sortOrder });
                                    }}
                                    className="sort-select"
                                >
                                    <option value="createdAt-desc">الأحدث أولاً</option>
                                    <option value="createdAt-asc">الأقدم أولاً</option>
                                    <option value="pricing.price-asc">السعر: من الأقل</option>
                                    <option value="pricing.price-desc">السعر: من الأعلى</option>
                                    <option value="ratings.average-desc">الأعلى تقييماً</option>
                                    <option value="stats.purchases-desc">الأكثر مبيعاً</option>
                                </select>
                            </div>
                        </div>

                        {/* شبكة المنتجات */}
                        {products.length > 0 ? (
                            <div className="products-grid">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product._id}
                                        product={product}
                                        showSecurityBadge={true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="no-products">
                                <div className="no-products-icon">📦</div>
                                <h3>لا توجد منتجات</h3>
                                <p>لم نعثر على منتجات تطابق معايير البحث المحددة.</p>
                                <button 
                                    onClick={handleResetFilters}
                                    className="btn btn-primary"
                                >
                                    عرض جميع المنتجات
                                </button>
                            </div>
                        )}

                        {/* الترقيم */}
                        {pagination.pages > 1 && (
                            <div className="products-pagination">
                                <button
                                    disabled={pagination.page === 1}
                                    onClick={() => handleFilterChange({ 
                                        page: pagination.page - 1 
                                    })}
                                    className="pagination-btn"
                                >
                                    السابق
                                </button>
                                
                                <div className="pagination-numbers">
                                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                                        .slice(
                                            Math.max(0, pagination.page - 3),
                                            Math.min(pagination.pages, pagination.page + 2)
                                        )
                                        .map(page => (
                                            <button
                                                key={page}
                                                onClick={() => handleFilterChange({ page })}
                                                className={`pagination-number ${
                                                    pagination.page === page ? 'active' : ''
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))
                                    }
                                </div>
                                
                                <button
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => handleFilterChange({ 
                                        page: pagination.page + 1 
                                    })}
                                    className="pagination-btn"
                                >
                                    التالي
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Products;