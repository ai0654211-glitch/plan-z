import validator from 'validator';
import { SecurityUtils } from './encryption.js';

export class ValidationUtils {

    // تحقق شامل من الإيميل
    static validateEmail(email) {
        if (!email) return false;

        const cleanEmail = validator.normalizeEmail(email, {
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
            outlookdotcom_remove_subaddress: false,
            yahoo_remove_subaddress: false,
            icloud_remove_subaddress: false
        });

        return validator.isEmail(cleanEmail) &&
            validator.isLength(cleanEmail, { min: 5, max: 254 });
    }

    // تحقق قوي من كلمة المرور
    static validatePassword(password) {
        if (!password || password.length < 8) return false;

        const checks = {
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noSpaces: !/\s/.test(password),
            noCommonPatterns: !this.isCommonPassword(password)
        };

        return Object.values(checks).every(check => check === true);
    }

    // تحقق من الهواتف الدولية
    static validatePhone(phone) {
        if (!phone) return false;

        // تنظيف الرقم
        const cleanPhone = phone.replace(/\D/g, '');

        // تحقق من الأرقام السعودية والعالمية
        const saudiPattern = /^(009665|9665|\+9665|05)(5|0|3|6|4|9|1|7|8)([0-9]{7})$/;
        const internationalPattern = /^\+?[1-9]\d{1,14}$/;

        return saudiPattern.test(cleanPhone) || internationalPattern.test(cleanPhone);
    }

    // تحقق من البيانات المالية
    static validatePrice(price) {
        if (typeof price !== 'number') return false;
        return price >= 0 &&
            price <= 1000000 && // حد أقصى مليون
            /^\d+(\.\d{1,2})?$/.test(price.toString());
    }

    // تحقق من بيانات العنوان
    static validateAddress(address) {
        if (!address || typeof address !== 'object') return false;

        const requiredFields = ['street', 'city', 'country'];
        const validFields = requiredFields.every(field =>
            address[field] &&
            validator.isLength(address[field].toString(), { min: 2, max: 100 })
        );

        return validFields &&
            (!address.postalCode || validator.isPostalCode(address.postalCode, 'any'));
    }

    // تحقق من توقيع البيانات
    static validateSignature(req, res, next) {
        try {
            const signature = req.headers['x-signature'];
            const timestamp = req.headers['x-timestamp'];

            if (!signature || !timestamp) {
                return res.status(401).json({
                    error: 'Missing security headers',
                    code: 'MISSING_SIGNATURE'
                });
            }

            // التحقق من أن الطلب حديث (منع replay attacks)
            const requestTime = parseInt(timestamp);
            const currentTime = Date.now();

            if (Math.abs(currentTime - requestTime) > 300000) { // 5 دقائق
                return res.status(401).json({
                    error: 'Request timestamp expired',
                    code: 'TIMESTAMP_EXPIRED'
                });
            }

            // إنشاء البيانات للتوقيع
            const dataToSign = `${timestamp}:${JSON.stringify(req.body)}`;
            const isValid = SecurityUtils.verifySignature(dataToSign, signature);

            if (!isValid) {
                return res.status(401).json({
                    error: 'Invalid request signature',
                    code: 'INVALID_SIGNATURE'
                });
            }

            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Signature validation failed',
                code: 'SIGNATURE_VALIDATION_FAILED'
            });
        }
    }

    // تنظيف وإعداد البيانات المدخلة
    static sanitizeInput(req, res, next) {
        try {
            // تنظيف query parameters
            if (req.query) {
                Object.keys(req.query).forEach(key => {
                    if (typeof req.query[key] === 'string') {
                        req.query[key] = validator.escape(
                            validator.trim(req.query[key])
                        );
                    }
                });
            }

            // تنظيف body data
            if (req.body && typeof req.body === 'object') {
                this.recursiveSanitize(req.body);
            }

            // تنظيف params
            if (req.params) {
                Object.keys(req.params).forEach(key => {
                    if (typeof req.params[key] === 'string') {
                        req.params[key] = validator.escape(
                            validator.trim(req.params[key])
                        );
                    }
                });
            }

            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Data sanitization failed',
                code: 'SANITIZATION_ERROR'
            });
        }
    }

    // تنظيف متكرر للكائنات المعقدة
    static recursiveSanitize(obj) {
        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'string') {
                    obj[key] = validator.escape(validator.trim(obj[key]));
                } else if (typeof obj[key] === 'object') {
                    this.recursiveSanitize(obj[key]);
                }
            });
        }
    }

    // كشف كلمات المرور الشائعة
    static isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '12345678', '123456789', '12345',
            'qwerty', 'abc123', 'password1', '1234567', '1234567890',
            'admin', 'welcome', 'monkey', 'password123'
        ];

        return commonPasswords.includes(password.toLowerCase());
    }

    // تحقق من صحة ملف
    static validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) {
        if (!file) return false;

        const maxSize = 5 * 1024 * 1024; // 5MB
        const isValidType = allowedTypes.includes(file.mimetype);
        const isValidSize = file.size <= maxSize;

        return isValidType && isValidSize;
    }
}