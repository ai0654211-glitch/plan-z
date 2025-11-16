import React, { useState, useEffect } from 'react';
import { productsAPI } from '../../services/api.js';
import { FrontendSecurity } from '../../utils/security.js';
import './ProductFilter.css';

const ProductFilter = ({ filters, onFilterChange, onReset }) => {
    const [categories, setCategories] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
    const [loading, setLoading] = useState(true);

    // تحميل بيانات الفلاتر
    useEffect(() => {
        const loadFilterData = async () => {
            try {
                // في التطبيق الحقيقي، سيتم جلب التصنيفات من API
                const mockCategories = [
                    { _id: '1', name: 'إلكترونيات' },
                    { _id: '2', name: 'ملابس' },
                    { _id: '3', name: 'أجهزة منزلية' },
                    { _id: '4', name: 'رياضة' },
                    { _id: '5', name: 'جمال وعناية' }
                ];

                setCategories(mockCategories);
                setPriceRange({ min: 0, max: 5000 }); // نطاق سعر واقعي

                FrontendSecurity.logSecurityEvent('FILTER_DATA_LOADED', {
                    categoriesCount: mockCategories.length
                });

            } catch (error) {
                console.error('Error loading filter data:', error);
                FrontendSecurity.logSecurityEvent('FILTER_DATA_ERROR', {
                    error: error.message
                });
            } finally {
                setLoading(false);
            }
        };

        loadFilterData();
    }, []);

    // معالجة تغيير الفلتر
    const handleFilterChange = (key, value) => {
        onFilterChange({ [key]: value });
        
        FrontendSecurity.logSecurityEvent('FILTER_CHANGED', {
            filter: key,
            value: value
        });
    };

    // معالجة تغيير نطاق السعر
    const handlePriceRangeChange = (min, max) => {
        onFilterChange({ 
            minPrice: min || '',
            maxPrice: max || ''
        });
    };

    // تنظيف فلتر معين
    const clearFilter = (filterKey) => {
        onFilterChange({ [filterKey]: '' });
    };

    if (loading) {
        return (
            <div className="filter-loading">
                <div className="loading-spinner"></div>
                <p>جاري تحميل الفلاتر...</p>
            </div>
        );
    }

    return (
        <div className="product-filters">
            {/* رأس الفلاتر */}
            <div className="filters-header">
                <h3 className="filters-title">تصفية المنتجات</h3>
                <button 
                    onClick={onReset}
                    className="reset-filters-btn"
                    disabled={Object.values(filters).every(val => !val)}
                >
                    🗑️ مسح الكل
                </button>
            </div>

            {/* البحث */}
            <div className="filter-section">
                <h4 className="filter-title">بحث</h4>
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="ابحث في المنتجات..."
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="filter-input search-input"
                    />
                </div>
            </div>

            {/* التصنيفات */}
            <div className="filter-section">
                <h4 className="filter-title">التصنيفات</h4>
                <div className="filter-group">
                    {categories.map(category => (
                        <label key={category._id} className="filter-checkbox-label">
                            <input
                                type="checkbox"
                                checked={filters.category === category._id}
                                onChange={(e) => 
                                    handleFilterChange('category', 
                                        e.target.checked ? category._id : ''
                                    )
                                }
                                className="filter-checkbox"
                            />
                            <span className="checkmark"></span>
                            {category.name}
                        </label>
                    ))}
                </div>
            </div>

            {/* نطاق السعر */}
            <div className="filter-section">
                <h4 className="filter-title">نطاق السعر</h4>
                <div className="filter-group">
                    <div className="price-inputs">
                        <div className="price-input-group">
                            <label>من</label>
                            <input
                                type="number"
                                placeholder="أقل سعر"
                                value={filters.minPrice || ''}
                                onChange={(e) => handlePriceRangeChange(e.target.value, filters.maxPrice)}
                                className="price-input"
                                min="0"
                            />
                        </div>
                        <div className="price-input-group">
                            <label>إلى</label>
                            <input
                                type="number"
                                placeholder="أعلى سعر"
                                value={filters.maxPrice || ''}
                                onChange={(e) => handlePriceRangeChange(filters.minPrice, e.target.value)}
                                className="price-input"
                                min="0"
                            />
                        </div>
                    </div>
                    
                    {/* شريط نطاق السعر */}
                    <div className="price-range-slider">
                        <div className="price-labels">
                            <span>0 ر.س</span>
                            <span>{priceRange.max} ر.س</span>
                        </div>
                        {/* يمكن إضافة slider حقيقي هنا */}
                    </div>
                </div>
            </div>

            {/* التوفر */}
            <div className="filter-section">
                <h4 className="filter-title">التوفر</h4>
                <div className="filter-group">
                    <label className="filter-checkbox-label">
                        <input
                            type="checkbox"
                            checked={filters.inStock === 'true'}
                            onChange={(e) => 
                                handleFilterChange('inStock', 
                                    e.target.checked ? 'true' : ''
                                )
                            }
                            className="filter-checkbox"
                        />
                        <span className="checkmark"></span>
                        المنتجات المتوفرة فقط
                    </label>
                </div>
            </div>

            {/* التقييمات */}
            <div className="filter-section">
                <h4 className="filter-title">التقييمات</h4>
                <div className="filter-group">
                    {[5, 4, 3, 2, 1].map(rating => (
                        <label key={rating} className="filter-radio-label">
                            <input
                                type="radio"
                                name="rating"
                                checked={filters.rating === rating.toString()}
                                onChange={(e) => 
                                    handleFilterChange('rating', 
                                        e.target.checked ? rating.toString() : ''
                                    )
                                }
                                className="filter-radio"
                            />
                            <span className="radio-mark"></span>
                            <span className="rating-stars">
                                {'★'.repeat(rating)}
                                {'☆'.repeat(5 - rating)}
                            </span>
                            <span className="rating-text">فما فوق</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* الفلاتر النشطة */}
            {(filters.category || filters.minPrice || filters.maxPrice || filters.inStock || filters.rating) && (
                <div className="active-filters">
                    <h4 className="filter-title">الفلاتر النشطة</h4>
                    <div className="active-filters-list">
                        {filters.category && (
                            <span className="active-filter">
                                تصنيف: {categories.find(c => c._id === filters.category)?.name}
                                <button 
                                    onClick={() => clearFilter('category')}
                                    className="remove-filter-btn"
                                >
                                    ✕
                                </button>
                            </span>
                        )}
                        
                        {(filters.minPrice || filters.maxPrice) && (
                            <span className="active-filter">
                                سعر: {filters.minPrice || 0} - {filters.maxPrice || priceRange.max} ر.س
                                <button 
                                    onClick={() => {
                                        clearFilter('minPrice');
                                        clearFilter('maxPrice');
                                    }}
                                    className="remove-filter-btn"
                                >
                                    ✕
                                </button>
                            </span>
                        )}
                        
                        {filters.inStock && (
                            <span className="active-filter">
                                متوفر فقط
                                <button 
                                    onClick={() => clearFilter('inStock')}
                                    className="remove-filter-btn"
                                >
                                    ✕
                                </button>
                            </span>
                        )}
                        
                        {filters.rating && (
                            <span className="active-filter">
                                تقييم: {filters.rating}+ نجوم
                                <button 
                                    onClick={() => clearFilter('rating')}
                                    className="remove-filter-btn"
                                >
                                    ✕
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* إحصائيات الفلترة */}
            <div className="filter-stats">
                <div className="stat-item">
                    <span className="stat-label">التصنيفات:</span>
                    <span className="stat-value">{categories.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">نطاق السعر:</span>
                    <span className="stat-value">{priceRange.min} - {priceRange.max} ر.س</span>
                </div>
            </div>
        </div>
    );
};

export default ProductFilter;