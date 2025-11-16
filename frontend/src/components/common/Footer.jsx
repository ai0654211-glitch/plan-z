import React from 'react';
import { Link } from 'react-router-dom';
import { FrontendSecurity } from '../../utils/security.js';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const handleSecureLink = (path) => {
        const safePath = FrontendSecurity.safeRedirect(path);
        if (safePath) {
            window.location.href = safePath;
        }
    };

    return (
        <footer className="secure-footer">
            <div className="footer-container">
                {/* القسم العلوي */}
                <div className="footer-top">
                    <div className="footer-section">
                        <div className="footer-logo">
                            <span className="logo-icon">🛡️</span>
                            <span className="logo-text">SecureStore</span>
                        </div>
                        <p className="footer-description">
                            منصة تسوق إلكترونية آمنة توفر لك تجربة شراء محمية 
                            بأساليب أمان متقدمة وتشفير قوي لحماية بياناتك.
                        </p>
                        <div className="security-badges">
                            <div className="badge">
                                <span className="badge-icon">🔒</span>
                                <span>SSL Secure</span>
                            </div>
                            <div className="badge">
                                <span className="badge-icon">🛡️</span>
                                <span>PCI Compliant</span>
                            </div>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-title">روابط سريعة</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/" className="footer-link">الرئيسية</Link>
                            </li>
                            <li>
                                <Link to="/products" className="footer-link">جميع المنتجات</Link>
                            </li>
                            <li>
                                <Link to="/about" className="footer-link">عن المتجر</Link>
                            </li>
                            <li>
                                <Link to="/contact" className="footer-link">اتصل بنا</Link>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-title">خدمة العملاء</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/shipping" className="footer-link">الشحن والتوصيل</Link>
                            </li>
                            <li>
                                <Link to="/returns" className="footer-link">الإرجاع والاستبدال</Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="footer-link">سياسة الخصوصية</Link>
                            </li>
                            <li>
                                <Link to="/terms" className="footer-link">الشروط والأحكام</Link>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-title">الأمان والدعم</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/security" className="footer-link">مركز الأمان</Link>
                            </li>
                            <li>
                                <Link to="/faq" className="footer-link">الأسئلة الشائعة</Link>
                            </li>
                            <li>
                                <a 
                                    href="#" 
                                    className="footer-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSecureLink('mailto:support@securestore.com');
                                    }}
                                >
                                    الدعم الفني
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#" 
                                    className="footer-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSecureLink('https://wa.me/966500000000');
                                    }}
                                >
                                    الدعم على واتساب
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-title">اشترك في النشرة</h4>
                        <p className="newsletter-description">
                            اشترك لتصلك أحدث العروض والأخبار الأمنية
                        </p>
                        <div className="newsletter-form">
                            <input 
                                type="email" 
                                placeholder="بريدك الإلكتروني"
                                className="newsletter-input"
                            />
                            <button className="newsletter-btn">
                                اشتراك
                            </button>
                        </div>
                        <div className="social-links">
                            <a 
                                href="#" 
                                className="social-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSecureLink('https://twitter.com/securestore');
                                }}
                                aria-label="تويتر"
                            >
                                🐦
                            </a>
                            <a 
                                href="#" 
                                className="social-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSecureLink('https://instagram.com/securestore');
                                }}
                                aria-label="انستجرام"
                            >
                                📷
                            </a>
                            <a 
                                href="#" 
                                className="social-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSecureLink('https://facebook.com/securestore');
                                }}
                                aria-label="فيسبوك"
                            >
                                👍
                            </a>
                        </div>
                    </div>
                </div>

                {/* القسم السفلي */}
                <div className="footer-bottom">
                    <div className="footer-copyright">
                        <p>
                            &copy; {currentYear} SecureStore. 
                            جميع الحقوق محفوظة. 
                            <span className="security-notice">
                                🔒 تم تطوير النظام بأعلى معايير الأمان
                            </span>
                        </p>
                    </div>
                    
                    <div className="footer-security">
                        <div className="security-info">
                            <span className="security-status">
                                ✅ الحالة: النظام مؤمن ومحمي
                            </span>
                            <span className="encryption-status">
                                🔐 التشفير: مفعل AES-256
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;