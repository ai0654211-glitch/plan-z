import helmet from 'helmet';
import hpp from 'hpp';
import xssClean from 'xss-clean';

// إعدادات Helmet للأمان
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
});

// منع تلوث المعلمات
const hppConfig = hpp({
    whitelist: [
        'price',
        'rating',
        'category',
        'sort',
        'limit',
        'page'
    ],
});

// تنظيف بيانات المدخلات من هجمات XSS
const xssConfig = xssClean();

// Middleware الأمان الرئيسي
const securityMiddleware = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
};

export {
    helmetConfig,
    hppConfig,
    xssConfig,
    securityMiddleware
};