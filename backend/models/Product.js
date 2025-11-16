import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const productSchema = new mongoose.Schema({
    // المعلومات الأساسية
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters'],
        set: (name) => SecurityUtils.encrypt(name)
    },

    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        set: (desc) => SecurityUtils.encrypt(desc)
    },

    // المعلومات المالية المشفرة
    pricing: {
        price: {
            type: Number,
            required: [true, 'Product price is required'],
            min: [0, 'Price cannot be negative'],
            max: [1000000, 'Price cannot exceed 1,000,000']
        },
        comparePrice: {
            type: Number,
            min: [0, 'Compare price cannot be negative']
        },
        costPrice: {
            type: Number,
            min: [0, 'Cost price cannot be negative']
        }
    },

    // المخزون والمتغيرات
    inventory: {
        sku: {
            type: String,
            unique: true,
            sparse: true,
            set: (sku) => SecurityUtils.encrypt(sku)
        },
        quantity: {
            type: Number,
            required: true,
            min: [0, 'Quantity cannot be negative'],
            default: 0
        },
        trackQuantity: {
            type: Boolean,
            default: true
        },
        allowBackorder: {
            type: Boolean,
            default: false
        }
    },

    // الوسائط
    media: {
        images: [{
            url: String,
            alt: String,
            isPrimary: {
                type: Boolean,
                default: false
            }
        }],
        videos: [{
            url: String,
            thumbnail: String,
            duration: Number
        }]
    },

    // التصنيفات والوسوم
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    tags: [String],

    // المتغيرات (مثل الألوان، المقاسات)
    variants: [{
        name: {
            type: String,
            required: true
        },
        options: [{
            name: String,
            price: Number,
            quantity: Number,
            sku: String
        }]
    }],

    // التقييمات والإحصائيات
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: [0, 'Rating cannot be less than 0'],
            max: [5, 'Rating cannot exceed 5']
        },
        count: {
            type: Number,
            default: 0
        },
        distribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        }
    },

    // الأمان والتحكم
    status: {
        type: String,
        enum: ['draft', 'active', 'archived', 'out_of_stock'],
        default: 'draft'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'hidden'],
        default: 'public'
    },

    // التحكم في الوصول
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // SEO وتحسين المحركات
    seo: {
        title: String,
        description: String,
        slug: {
            type: String,
            unique: true,
            lowercase: true
        },
        metaKeywords: [String]
    },

    // الإحصائيات
    stats: {
        views: {
            type: Number,
            default: 0
        },
        purchases: {
            type: Number,
            default: 0
        },
        wishlists: {
            type: Number,
            default: 0
        }
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // فك تشفير البيانات عند الإرجاع
            ret.name = SecurityUtils.decrypt(ret.name);
            ret.description = SecurityUtils.decrypt(ret.description);
            if (ret.inventory.sku) {
                ret.inventory.sku = SecurityUtils.decrypt(ret.inventory.sku);
            }
            return ret;
        }
    }
});

// Middleware قبل الحفظ
productSchema.pre('save', function(next) {
    // إنشاء slug تلقائي من الاسم
    if (this.isModified('name') && !this.seo.slug) {
        const name = SecurityUtils.decrypt(this.name);
        this.seo.slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    // تحديث حالة المنتج بناءً على المخزون
    if (this.isModified('inventory.quantity') && this.inventory.trackQuantity) {
        if (this.inventory.quantity === 0 && !this.inventory.allowBackorder) {
            this.status = 'out_of_stock';
        } else if (this.status === 'out_of_stock' && this.inventory.quantity > 0) {
            this.status = 'active';
        }
    }

    next();
});

// Virtuals
productSchema.virtual('isInStock').get(function() {
    return this.inventory.quantity > 0 || this.inventory.allowBackorder;
});

productSchema.virtual('discountPercentage').get(function() {
    if (!this.pricing.comparePrice || this.pricing.comparePrice <= this.pricing.price) {
        return 0;
    }
    return Math.round(((this.pricing.comparePrice - this.pricing.price) / this.pricing.comparePrice) * 100);
});

// الفهرس للأداء
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ status: 1, visibility: 1 });
productSchema.index({ 'pricing.price': 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ categories: 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'stats.purchases': -1 });

// الطرق المخصصة
productSchema.methods = {
    // زيادة عدد المشاهدات
    incrementViews() {
        this.stats.views += 1;
        return this.save();
    },

    // زيادة عدد المبيعات
    incrementPurchases(quantity = 1) {
        this.stats.purchases += quantity;
        if (this.inventory.trackQuantity) {
            this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
        }
        return this.save();
    },

    // تحديث التقييم
    updateRating(newRating) {
        const oldRating = this.ratings.average;
        const totalRatings = this.ratings.count;

        this.ratings.average = ((oldRating * totalRatings) + newRating) / (totalRatings + 1);
        this.ratings.count += 1;
        this.ratings.distribution[newRating] += 1;

        return this.save();
    },

    // التحقق من توفر المنتج
    isAvailable(quantity = 1) {
        if (!this.inventory.trackQuantity) return true;
        if (this.inventory.allowBackorder) return true;
        return this.inventory.quantity >= quantity;
    }
};

// الاستعلامات الثابتة
productSchema.statics = {
    // الحصول على المنتجات النشطة فقط
    findActive() {
        return this.find({
            status: 'active',
            visibility: 'public'
        });
    },

    // البحث في المنتجات
    searchProducts(query, filters = {}) {
        const searchQuery = {
            status: 'active',
            visibility: 'public',
            $text: { $search: query }
        };

        return this.find(searchQuery)
            .sort({ score: { $meta: 'textScore' } })
            .select('-description -seo.metaKeywords');
    },

    // الحصول على المنتجات الأكثر مبيعاً
    getBestSellers(limit = 10) {
        return this.find({ status: 'active' })
            .sort({ 'stats.purchases': -1 })
            .limit(limit);
    }
};

export default mongoose.model('Product', productSchema);