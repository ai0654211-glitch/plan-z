const rateLimit = require('express-rate-limit');

// تحديد معدل الطلبات العامة
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد 100 طلب لكل IP
    message: {
        success: false,
        message: 'لقد تجاوزت عدد الطلبات المسموح بها، يرجى المحاولة لاحقاً'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// تحديد معدل طلبات المصادقة
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // 5 محاولات تسجيل دخول فقط
    message: {
        success: false,
        message: 'عدد كبير من محاولات التسجيل، يرجى المحاولة بعد 15 دقيقة'
    },
});

// تحديد معدل طلبات الـ API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 دقيقة
    max: 60, // 60 طلب في الدقيقة
    message: {
        success: false,
        message: 'تم تجاوز حد الطلبات المسموح به'
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
};