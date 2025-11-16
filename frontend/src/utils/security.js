import CryptoJS from 'crypto-js';

export class FrontendSecurity {

    static #encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || 'frontend-secure-key-2024';

    // تشفير بيانات التخزين المحلي
    static encryptLocalData(data) {
        try {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(data),
                this.#encryptionKey
            ).toString();

            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // فك تشفير بيانات التخزين المحلي
    static decryptLocalData(encryptedData) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.#encryptionKey);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);

            return decrypted ? JSON.parse(decrypted) : null;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // تخزين آمن في localStorage
    static secureSetItem(key, value) {
        try {
            const encryptedValue = this.encryptLocalData({
                data: value,
                timestamp: Date.now(),
                signature: this.generateSignature(value)
            });

            if (encryptedValue) {
                localStorage.setItem(key, encryptedValue);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Secure storage error:', error);
            return false;
        }
    }

    // قراءة آمنة من localStorage
    static secureGetItem(key, maxAge = 24 * 60 * 60 * 1000) { // افتراضي 24 ساعة
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;

            const decrypted = this.decryptLocalData(encrypted);
            if (!decrypted) {
                this.removeItem(key);
                return null;
            }

            // التحقق من التوقيع
            const isValidSignature = this.verifySignature(decrypted.data, decrypted.signature);
            const isNotExpired = Date.now() - decrypted.timestamp < maxAge;

            if (!isValidSignature || !isNotExpired) {
                this.removeItem(key);
                return null;
            }

            return decrypted.data;
        } catch (error) {
            console.error('Secure retrieval error:', error);
            this.removeItem(key);
            return null;
        }
    }

    // توليد توقيع للبيانات
    static generateSignature(data) {
        return CryptoJS.HmacSHA256(
            JSON.stringify(data),
            this.#encryptionKey
        ).toString();
    }

    // التحقق من التوقيع
    static verifySignature(data, signature) {
        const expectedSignature = this.generateSignature(data);
        return expectedSignature === signature;
    }

    // تنظيف البيانات المدخلة
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // التحقق من صحة الإيميل
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    // منع هجمات XSS
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // حماية من النقرات الخبيثة
    static safeRedirect(url, allowedDomains = [window.location.hostname]) {
        try {
            const urlObj = new URL(url, window.location.origin);

            if (allowedDomains.includes(urlObj.hostname) ||
                urlObj.protocol === 'mailto:' ||
                urlObj.protocol === 'tel:') {
                return url;
            }

            console.warn('Blocked redirect to untrusted domain:', urlObj.hostname);
            return null;
        } catch (error) {
            console.error('Invalid URL:', error);
            return null;
        }
    }

    // إدارة التوكنات الآمنة
    static setAuthToken(token) {
        this.secureSetItem('auth_token', token);

        // أيضًا في sessionStorage للجلسة الحالية فقط
        sessionStorage.setItem('session_token', token);
    }

    static getAuthToken() {
        return this.secureGetItem('auth_token') || sessionStorage.getItem('session_token');
    }

    static clearAuth() {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('session_token');

        // تنظيف إضافي
        ['user_data', 'cart_data', 'session_data'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    // كشف بيئة التطوير
    static isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }

    // تسجيل أحداث الأمان
    static logSecurityEvent(event, data = {}) {
        if (this.isDevelopment()) {
            console.log(`🔒 Security Event: ${event}`, data);
        }

        // إرسال للسيرفر في production
        if (!this.isDevelopment()) {
            fetch('/api/security/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event,
                    data,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            }).catch(() => { /* fail silently */ });
        }
    }
}

// حماية global objects
Object.freeze(FrontendSecurity.prototype);
