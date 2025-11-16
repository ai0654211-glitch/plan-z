import mongoose from 'mongoose';
import { SecurityUtils } from './encryption.js';

// بسيط: تنظيف المدخلات من مفاتيح قد تستخدم للهجوم
function deepSanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitize);

    const clean = {};
    for (const key of Object.keys(obj)) {
        // منع مفاتيح خاصة بموغو ($) أو النقطة لتحاشي NoSQL injections
        if (key.startsWith('$') || key.includes('.')) continue;
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
            clean[key] = deepSanitize(val);
        } else {
            clean[key] = val;
        }
    }
    return clean;
}

function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[\$<>]/g, '').trim();
}

function isValidObjectId(id) {
    if (!id) return false;
    return mongoose.Types.ObjectId.isValid(id);
}

function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw) {
    if (!pw || typeof pw !== 'string') return false;
    // at least 8 chars, uppercase, lowercase, number, special
    return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(pw);
}

function validatePhone(phone) {
    if (!phone) return false;
    return /^[0-9+()\-\s]{6,20}$/.test(phone);
}

export const ValidationUtils = {
    sanitizeInput: (req, res, next) => {
        try {
            if (req.body) req.body = deepSanitize(req.body);
            if (req.query) req.query = deepSanitize(req.query);
            if (req.params) req.params = deepSanitize(req.params);
            next();
        } catch (err) {
            next(err);
        }
    },

    validateSignature: (req, res, next) => {
        try {
            const signature = req.headers['x-signature'] || (req.body && req.body.signature);
            const payload = req.body && req.body.data ? req.body.data : JSON.stringify(req.body || {});

            if (!signature) {
                return res.status(400).json({ error: 'Missing signature', code: 'NO_SIGNATURE' });
            }

            const valid = SecurityUtils.verifySignature(typeof payload === 'string' ? payload : JSON.stringify(payload), signature);
            if (!valid) return res.status(401).json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' });
            next();
        } catch (err) {
            return res.status(400).json({ error: 'Signature validation failed', code: 'SIGNATURE_ERROR' });
        }
    },

    // utilities
    deepSanitize,
    sanitizeString,
    isValidObjectId,
    validateEmail,
    validatePassword,
    validatePhone
};

export default ValidationUtils;