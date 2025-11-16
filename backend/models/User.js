import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const userSchema = new mongoose.Schema({
    // معلومات أساسية مشفرة
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email'
        },
        set: (email) => SecurityUtils.encrypt(email.toLowerCase())
    },

    // كلمة مرور مشفرة
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // عدم إرجاعها في الاستعلامات
    },

    // بيانات شخصية مشفرة
    personalInfo: {
        firstName: {
            type: String,
            set: (name) => SecurityUtils.encrypt(name)
        },
        lastName: {
            type: String,
            set: (name) => SecurityUtils.encrypt(name)
        },
        phone: {
            type: String,
            set: (phone) => SecurityUtils.encrypt(phone)
        }
    },

    // الصلاحيات والأمان
    role: {
        type: String,
        enum: ['user', 'vendor', 'admin', 'super_admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // تتبع الأمان
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    loginHistory: [{
        ip: String,
        userAgent: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // التوكنات
    refreshTokens: [{
        token: String,
        expires: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // التحقق بخطوتين
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false
        },
        secret: String
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // إخفاء البيانات الحساسة
            delete ret.password;
            delete ret.refreshTokens;
            delete ret.twoFactorAuth;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// Middleware قبل الحفظ
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        this.password = await SecurityUtils.hashPassword(this.password);
        next();
    } catch (error) {
        next(error);
    }
});

// methods للأمان
userSchema.methods = {
    // التحقق من كلمة المرور
    async verifyPassword(candidatePassword) {
        return await SecurityUtils.verifyPassword(candidatePassword, this.password);
    },

    // فك تشفير البيانات
    getDecryptedEmail() {
        return SecurityUtils.decrypt(this.email);
    },

    getDecryptedPersonalInfo() {
        return {
            firstName: SecurityUtils.decrypt(this.personalInfo.firstName),
            lastName: SecurityUtils.decrypt(this.personalInfo.lastName),
            phone: SecurityUtils.decrypt(this.personalInfo.phone)
        };
    },

    // إدارة قفل الحساب
    isLocked() {
        return !!(this.lockUntil && this.lockUntil > Date.now());
    },

    // زيادة محاولات التسجيل الفاشلة
    async incrementLoginAttempts() {
        if (this.lockUntil && this.lockUntil < Date.now()) {
            return await this.updateOne({
                $set: { loginAttempts: 1 },
                $unset: { lockUntil: 1 }
            });
        }

        const updates = { $inc: { loginAttempts: 1 } };

        if (this.loginAttempts + 1 >= 5) {
            updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // قفل لمدة ساعتين
        }

        return await this.updateOne(updates);
    }
};

// الفهرس للأداء
userSchema.index({ email: 1 });
userSchema.index({ 'personalInfo.phone': 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: 1 });

export default mongoose.model('User', userSchema);