const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');

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
const xssConfig = xss();

module.exports = {
    helmetConfig,
    hppConfig,
    xssConfig,
};