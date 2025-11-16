import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import './Header.css';

const Header = () => {
    const { user, isAuthenticated, logout, isAdmin, isVendor } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const profileRef = useRef(null);

    // إغلاق القوائم عند النقر خارجها
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // إغلاق القوائم عند تغيير المسار
    useEffect(() => {
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
            FrontendSecurity.logSecurityEvent('USER_LOGOUT', {
                userId: user?.id
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSecureNavigation = (path) => {
        const safePath = FrontendSecurity.safeRedirect(path);
        if (safePath) {
            navigate(safePath);
        } else {
            console.warn('Blocked navigation to unsafe path:', path);
        }
    };

    return (
        <header className="secure-header" role="banner">
            <div className="header-container">
                {/* الشعار */}
                <div className="logo-section">
                    <Link 
                        to="/" 
                        className="logo-link"
                        onClick={() => handleSecureNavigation('/')}
                    >
                        <div className="logo">
                            <span className="logo-icon">🛡️</span>
                            <span className="logo-text">SecureStore</span>
                        </div>
                    </Link>
                </div>

                {/* البحث (للكمبيوتر فقط) */}
                <div className="search-section">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="ابحث عن المنتجات..."
                            className="search-input"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    const query = e.target.value.trim();
                                    if (query) {
                                        handleSecureNavigation(`/products?search=${encodeURIComponent(query)}`);
                                    }
                                }
                            }}
                        />
                        <button className="search-btn">
                            <span className="search-icon">🔍</span>
                        </button>
                    </div>
                </div>

                {/* التنقل الرئيسي */}
                <nav className="nav-section" ref={menuRef}>
                    {/* زر القائمة للجوال */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="قائمة التنقل"
                        aria-expanded={isMenuOpen}
                    >
                        <span className={`menu-icon ${isMenuOpen ? 'open' : ''}`}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </button>

                    {/* قائمة التنقل */}
                    <ul className={`nav-list ${isMenuOpen ? 'open' : ''}`}>
                        <li className="nav-item">
                            <Link 
                                to="/" 
                                className="nav-link"
                                onClick={() => handleSecureNavigation('/')}
                            >
                                الرئيسية
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link 
                                to="/products" 
                                className="nav-link"
                                onClick={() => handleSecureNavigation('/products')}
                            >
                                المنتجات
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link 
                                to="/categories" 
                                className="nav-link"
                                onClick={() => handleSecureNavigation('/categories')}
                            >
                                التصنيفات
                            </Link>
                        </li>
                        
                        {/* روابط للمسؤولين والبائعين */}
                        {(isAdmin || isVendor) && (
                            <li className="nav-item admin-link">
                                <Link 
                                    to="/admin" 
                                    className="nav-link admin"
                                    onClick={() => handleSecureNavigation('/admin')}
                                >
                                    <span className="admin-icon">👑</span>
                                    لوحة التحكم
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>

                {/* قسم المستخدم */}
                <div className="user-section" ref={profileRef}>
                    {isAuthenticated ? (
                        // مستخدم مسجل الدخول
                        <div className="user-menu">
                            <button
                                className="user-btn"
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                aria-label="قائمة المستخدم"
                                aria-expanded={isProfileMenuOpen}
                            >
                                <div className="user-avatar">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <span className="user-name">
                                    {user?.email?.split('@')[0]}
                                </span>
                                <span className={`dropdown-arrow ${isProfileMenuOpen ? 'open' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {/* قائمة المستخدم */}
                            {isProfileMenuOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-header">
                                        <div className="user-info">
                                            <div className="user-avatar large">
                                                {user?.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <div className="user-email">
                                                    {user?.email}
                                                </div>
                                                <div className="user-role">
                                                    {user?.role === 'admin' && '👑 مسؤول'}
                                                    {user?.role === 'vendor' && '🏪 بائع'}
                                                    {user?.role === 'user' && '👤 مستخدم'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dropdown-menu">
                                        <Link 
                                            to="/profile" 
                                            className="dropdown-item"
                                            onClick={() => {
                                                handleSecureNavigation('/profile');
                                                setIsProfileMenuOpen(false);
                                            }}
                                        >
                                            <span className="item-icon">👤</span>
                                            الملف الشخصي
                                        </Link>
                                        
                                        <Link 
                                            to="/orders" 
                                            className="dropdown-item"
                                            onClick={() => {
                                                handleSecureNavigation('/orders');
                                                setIsProfileMenuOpen(false);
                                            }}
                                        >
                                            <span className="item-icon">📦</span>
                                            طلباتي
                                        </Link>

                                        <Link 
                                            to="/wishlist" 
                                            className="dropdown-item"
                                            onClick={() => {
                                                handleSecureNavigation('/wishlist');
                                                setIsProfileMenuOpen(false);
                                            }}
                                        >
                                            <span className="item-icon">❤️</span>
                                            المفضلة
                                        </Link>

                                        {/* روابط إضافية للمسؤولين */}
                                        {isAdmin && (
                                            <>
                                                <div className="dropdown-divider"></div>
                                                <Link 
                                                    to="/admin/security" 
                                                    className="dropdown-item admin"
                                                    onClick={() => {
                                                        handleSecureNavigation('/admin/security');
                                                        setIsProfileMenuOpen(false);
                                                    }}
                                                >
                                                    <span className="item-icon">🛡️</span>
                                                    الأمان
                                                </Link>
                                            </>
                                        )}

                                        <div className="dropdown-divider"></div>
                                        
                                        <button
                                            className="dropdown-item logout"
                                            onClick={handleLogout}
                                        >
                                            <span className="item-icon">🚪</span>
                                            تسجيل الخروج
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // زائر غير مسجل
                        <div className="auth-buttons">
                            <Link 
                                to="/login" 
                                className="auth-btn login"
                                onClick={() => handleSecureNavigation('/login')}
                            >
                                تسجيل الدخول
                            </Link>
                            <Link 
                                to="/register" 
                                className="auth-btn register"
                                onClick={() => handleSecureNavigation('/register')}
                            >
                                إنشاء حساب
                            </Link>
                        </div>
                    )}

                    {/* سلة التسوق */}
                    <Link 
                        to="/cart" 
                        className="cart-btn"
                        onClick={() => handleSecureNavigation('/cart')}
                    >
                        <span className="cart-icon">🛒</span>
                        <span className="cart-count">0</span>
                    </Link>
                </div>
            </div>

            {/* طبقة التعتيم للقائمة على الجوال */}
            {isMenuOpen && (
                <div 
                    className="mobile-overlay"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </header>
    );
};

export default Header;