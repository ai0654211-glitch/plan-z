import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const orderSchema = new mongoose.Schema({
    // معلومات الطلب الأساسية
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },

    // معلومات العميل المشفرة
    customer: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        email: {
            type: String,
            required: true,
            set: (email) => SecurityUtils.encrypt(email.toLowerCase())
        },
        phone: {
            type: String,
            set: (phone) => SecurityUtils.encrypt(phone)
        }
    },

    // عناوين الشحن والفواتير المشفرة
    shippingAddress: {
        firstName: { type: String, set: (name) => SecurityUtils.encrypt(name) },
        lastName: { type: String, set: (name) => SecurityUtils.encrypt(name) },
        street: { type: String, set: (street) => SecurityUtils.encrypt(street) },
        city: { type: String, set: (city) => SecurityUtils.encrypt(city) },
        state: { type: String, set: (state) => SecurityUtils.encrypt(state) },
        postalCode: { type: String, set: (code) => SecurityUtils.encrypt(code) },
        country: { type: String, default: 'Saudi Arabia', set: (country) => SecurityUtils.encrypt(country) }
    },

    billingAddress: {
        firstName: { type: String, set: (name) => SecurityUtils.encrypt(name) },
        lastName: { type: String, set: (name) => SecurityUtils.encrypt(name) },
        street: { type: String, set: (street) => SecurityUtils.encrypt(street) },
        city: { type: String, set: (city) => SecurityUtils.encrypt(city) },
        state: { type: String, set: (state) => SecurityUtils.encrypt(state) },
        postalCode: { type: String, set: (code) => SecurityUtils.encrypt(code) },
        country: { type: String, default: 'Saudi Arabia', set: (country) => SecurityUtils.encrypt(country) }
    },

    // عناصر الطلب
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String,
            required: true,
            set: (name) => SecurityUtils.encrypt(name)
        },
        productImage: String,
        variant: {
            name: String,
            option: String
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        }
    }],

    // التفاصيل المالية
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        shipping: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        tax: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        discount: {
            type: Number,
            min: 0,
            default: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },

    // معلومات الشحن
    shipping: {
        method: {
            type: String,
            required: true,
            enum: ['standard', 'express', 'next_day']
        },
        cost: {
            type: Number,
            required: true,
            min: 0
        },
        trackingNumber: {
            type: String,
            set: (tracking) => tracking ? SecurityUtils.encrypt(tracking) : undefined
        },
        carrier: String,
        estimatedDelivery: Date,
        deliveredAt: Date
    },

    // معلومات الدفع
    payment: {
        method: {
            type: String,
            required: true,
            enum: ['credit_card', 'debit_card', 'stripe', 'apple_pay', 'google_pay']
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: {
            type: String,
            set: (id) => SecurityUtils.encrypt(id)
        },
        paymentIntentId: {
            type: String,
            set: (id) => SecurityUtils.encrypt(id)
        },
        paidAt: Date
    },

    // حالة الطلب
    status: {
        type: String,
        required: true,
        enum: [
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'refunded'
        ],
        default: 'pending'
    },

    // إشعارات وتواريخ
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // ملاحظات الطلب
    notes: {
        customer: String,
        admin: String
    },

    // الكوبونات والعروض
    coupon: {
        code: String,
        discountAmount: Number,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        }
    },

    // الأمان والتحقق
    security: {
        ipAddress: {
            type: String,
            set: (ip) => SecurityUtils.encrypt(ip)
        },
        userAgent: String,
        fraudScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        isFlagged: {
            type: Boolean,
            default: false
        },
        verificationRequired: {
            type: Boolean,
            default: false
        }
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // فك تشفير البيانات الحساسة عند الإرجاع
            ret.customer.email = SecurityUtils.decrypt(ret.customer.email);
            if (ret.customer.phone) {
                ret.customer.phone = SecurityUtils.decrypt(ret.customer.phone);
            }

            // فك تشفير العناوين
            ['shippingAddress', 'billingAddress'].forEach(addressType => {
                if (ret[addressType]) {
                    Object.keys(ret[addressType]).forEach(key => {
                        if (typeof ret[addressType][key] === 'string') {
                            ret[addressType][key] = SecurityUtils.decrypt(ret[addressType][key]);
                        }
                    });
                }
            });

            // فك تشفير أسماء المنتجات
            ret.items.forEach(item => {
                item.productName = SecurityUtils.decrypt(item.productName);
            });

            // إخفاء البيانات الحساسة
            delete ret.security;
            delete ret.payment.transactionId;
            delete ret.payment.paymentIntentId;

            return ret;
        }
    }
});

// Middleware قبل الحفظ
orderSchema.pre('save', function(next) {
    // إنشاء رقم طلب فريد إذا كان جديداً
    if (this.isNew) {
        this.orderNumber = this.generateOrderNumber();
    }

    // حساب الإجماليات
    this.calculateTotals();

    // تحديث سجل الحالة
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            note: 'تم تحديث حالة الطلب'
        });
    }

    next();
});

// توليد رقم طلب فريد
orderSchema.methods.generateOrderNumber = function() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
};

// حساب الإجماليات
orderSchema.methods.calculateTotals = function() {
    // حساب المجموع الفرعي
    this.pricing.subtotal = this.items.reduce((total, item) => {
        return total + (item.unitPrice * item.quantity);
    }, 0);

    // حساب الإجمالي النهائي
    this.pricing.total = this.pricing.subtotal +
        this.pricing.shipping +
        this.pricing.tax -
        this.pricing.discount;
};

// Virtuals
orderSchema.virtual('itemCount').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

orderSchema.virtual('isPaid').get(function() {
    return this.payment.status === 'completed';
});

orderSchema.virtual('canBeCancelled').get(function() {
    return ['pending', 'confirmed', 'processing'].includes(this.status);
});

orderSchema.virtual('estimatedDeliveryDate').get(function() {
    return this.shipping.estimatedDelivery;
});

// الطرق المخصصة
orderSchema.methods = {
    // إضافة عنصر للطلب
    addItem(product, quantity, variant = null) {
        const item = {
            product: product._id,
            productName: product.name,
            productImage: product.media?.images?.[0]?.url,
            variant,
            quantity,
            unitPrice: product.pricing.price,
            totalPrice: product.pricing.price * quantity
        };

        this.items.push(item);
        this.calculateTotals();
    },

    // تطبيق كوبون
    applyCoupon(coupon) {
        if (coupon.discountType === 'percentage') {
            this.pricing.discount = (this.pricing.subtotal * coupon.discountValue) / 100;
        } else {
            this.pricing.discount = coupon.discountValue;
        }

        this.coupon = {
            code: coupon.code,
            discountAmount: this.pricing.discount,
            discountType: coupon.discountType
        };

        this.calculateTotals();
    },

    // تحديث حالة الطلب
    updateStatus(newStatus, note = '', updatedBy = null) {
        this.status = newStatus;
        this.statusHistory.push({
            status: newStatus,
            timestamp: new Date(),
            note,
            updatedBy
        });
    },

    // التحقق من إمكانية الإرجاع
    canBeReturned() {
        const deliveredDate = this.shipping.deliveredAt || this.updatedAt;
        const returnPeriod = 14 * 24 * 60 * 60 * 1000; // 14 يوم
        return Date.now() - deliveredDate <= returnPeriod;
    }
};

// الاستعلامات الثابتة
orderSchema.statics = {
    // الحصول على طلبات مستخدم
    findByUser(userId) {
        return this.find({ 'customer.userId': userId })
            .sort({ createdAt: -1 })
            .populate('items.product', 'name media');
    },

    // الحصول على طلبات بحالة معينة
    findByStatus(status) {
        return this.find({ status })
            .sort({ createdAt: -1 })
            .populate('customer.userId', 'personalInfo email');
    },

    // إحصائيات الطلبات
    async getOrderStats() {
        const stats = await this.aggregate([{
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.total' },
                averageOrderValue: { $avg: '$pricing.total' }
            }
        }]);

        return stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
    }
};

// الفهرس للأداء
orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'shipping.trackingNumber': 1 });

export default mongoose.model('Order', orderSchema);
