import React from 'react';
import { FrontendSecurity } from '../../utils/security.js';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
    size = 'medium', 
    color = 'primary', 
    text = '',
    overlay = false,
    secure = true 
}) => {
    
    // تسجيل تحميل المكون للأمان
    React.useEffect(() => {
        if (secure) {
            FrontendSecurity.logSecurityEvent('LOADING_SPINNER_MOUNTED', {
                size,
                overlay,
                timestamp: new Date().toISOString()
            });
        }
    }, [size, overlay, secure]);

    const getSizeClass = () => {
        switch (size) {
            case 'small': return 'spinner-small';
            case 'large': return 'spinner-large';
            case 'xlarge': return 'spinner-xlarge';
            default: return 'spinner-medium';
        }
    };

    const getColorClass = () => {
        switch (color) {
            case 'secondary': return 'spinner-secondary';
            case 'success': return 'spinner-success';
            case 'warning': return 'spinner-warning';
            case 'error': return 'spinner-error';
            default: return 'spinner-primary';
        }
    };

    const spinnerContent = (
        <div className={`loading-spinner-container ${overlay ? 'spinner-overlay' : ''}`}>
            <div className="spinner-content">
                {/* مؤشر التحميل الرئيسي */}
                <div className={`secure-spinner ${getSizeClass()} ${getColorClass()}`}>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-center"></div>
                    
                    {/* طبقة الحماية البصرية */}
                    {secure && (
                        <div className="security-shield">
                            <div className="shield-icon">🛡️</div>
                        </div>
                    )}
                </div>
                
                {/* النص المرافق */}
                {text && (
                    <div className="spinner-text">
                        <span className="text-content">{text}</span>
                        {secure && (
                            <span className="security-badge">🔒 آمن</span>
                        )}
                    </div>
                )}
                
                {/* معلومات التحميل الإضافية */}
                {secure && (
                    <div className="loading-details">
                        <div className="detail-item">
                            <span className="detail-label">الحالة:</span>
                            <span className="detail-value">جاري التحميل الآمن</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">التشفير:</span>
                            <span className="detail-value active">مفعل</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* طبقة الحماية من اللمس */}
            {overlay && (
                <div className="spinner-backdrop" 
                     onClick={(e) => {
                         // منع التفاعل أثناء التحميل
                         e.preventDefault();
                         e.stopPropagation();
                         
                         if (secure) {
                             FrontendSecurity.logSecurityEvent('LOADING_INTERACTION_BLOCKED', {
                                 action: 'backdrop_click',
                                 timestamp: new Date().toISOString()
                             });
                         }
                     }}
                />
            )}
        </div>
    );

    return spinnerContent;
};

// مكون فرعي للشاشات الكاملة
export const FullPageLoader = ({ message = 'جاري التحميل...', secure = true }) => {
    return (
        <div className="full-page-loader">
            <div className="full-page-content">
                <LoadingSpinner 
                    size="xlarge" 
                    overlay={true} 
                    secure={secure}
                    text={message}
                />
                
                {/* معلومات أمان إضافية */}
                {secure && (
                    <div className="security-status">
                        <div className="status-item">
                            <div className="status-indicator active"></div>
                            <span>التحقق من الجلسة</span>
                        </div>
                        <div className="status-item">
                            <div className="status-indicator active"></div>
                            <span>تحميل البيانات المشفرة</span>
                        </div>
                        <div className="status-item">
                            <div className="status-indicator"></div>
                            <span>تهيئة الواجهة الآمنة</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// مكون للتحميل ضمن العناصر
export const InlineLoader = ({ size = 'small', secure = true }) => {
    return (
        <div className="inline-loader">
            <LoadingSpinner size={size} secure={secure} />
        </div>
    );
};

// مكون للتحميل مع النص
export const TextLoader = ({ text, secure = true }) => {
    return (
        <div className="text-loader">
            <LoadingSpinner size="medium" secure={secure} text={text} />
        </div>
    );
};

export default LoadingSpinner;