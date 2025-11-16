import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const categorySchema = new mongoose.Schema({
    // المعلومات الأساسية
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters'],
        set: (name) => SecurityUtils.encrypt(name)
    },

    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        set: (desc) => SecurityUtils.encrypt(desc)
    },

    // SEO والروابط
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    // التدرج الهرمي
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },

    // الوسائط
    image: {
        url: String,
        alt: String,
        caption: String
    },

    // التخصيص
    icon: {
        type: String,
        default: '📁'
    },

    color: {
        type: String,
        default: '#6B7280'
    },

    // الترتيب والعرض
    order: {
        type: Number,
        default: 0,
        min: [0, 'Order cannot be negative']
    },

    visibility: {
        type: String,
        enum: ['public', 'private', 'hidden'],
        default: 'public'
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    },

    // الإحصائيات
    stats: {
        productCount: {
            type: Number,
            default: 0
        },
        viewCount: {
            type: Number,
            default: 0
        },
        purchaseCount: {
            type: Number,
            default: 0
        }
    },

    // SEO وتحسين المحركات
    seo: {
        metaTitle: {
            type: String,
            maxlength: [60, 'Meta title cannot exceed 60 characters'],
            set: (title) => SecurityUtils.encrypt(title)
        },
        metaDescription: {
            type: String,
            maxlength: [160, 'Meta description cannot exceed 160 characters'],
            set: (desc) => SecurityUtils.encrypt(desc)
        },
        keywords: [{
            type: String,
            set: (keyword) => SecurityUtils.encrypt(keyword)
        }],
        canonicalUrl: String
    },

    // التحكم في الوصول
    accessControl: {
        allowedRoles: [{
            type: String,
            enum: ['user', 'vendor', 'admin', 'super_admin']
        }],
        minOrderAmount: {
            type: Number,
            min: 0,
            default: 0
        },
        requiresVerification: {
            type: Boolean,
            default: false
        }
    },

    // التواريخ المهمة
    displayStart: {
        type: Date,
        default: null
    },

    displayEnd: {
        type: Date,
        default: null
    },

    // السجلات والتتبع
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // فك تشفير البيانات عند الإرجاع
            ret.name = SecurityUtils.decrypt(ret.name);
            if (ret.description) ret.description = SecurityUtils.decrypt(ret.description);
            if (ret.seo.metaTitle) ret.seo.metaTitle = SecurityUtils.decrypt(ret.seo.metaTitle);
            if (ret.seo.metaDescription) ret.seo.metaDescription = SecurityUtils.decrypt(ret.seo.metaDescription);
            if (ret.seo.keywords) {
                ret.seo.keywords = ret.seo.keywords.map(keyword => SecurityUtils.decrypt(keyword));
            }

            // إخفاء الحقول الحساسة
            delete ret.accessControl;
            delete ret.createdBy;
            delete ret.updatedBy;

            return ret;
        }
    }
});

// Middleware قبل الحفظ
categorySchema.pre('save', function(next) {
    // إنشاء slug تلقائي من الاسم إذا لم يكن موجوداً
    if (this.isModified('name') && !this.slug) {
        const name = SecurityUtils.decrypt(this.name);
        this.slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    // التحقق من تاريخ العرض
    if (this.displayStart && this.displayEnd && this.displayStart > this.displayEnd) {
        return next(new Error('تاريخ بداية العرض يجب أن يكون قبل تاريخ النهاية'));
    }

    next();
});

// Virtuals
categorySchema.virtual('isVisible').get(function() {
    if (this.visibility === 'hidden') return false;
    if (this.status !== 'active') return false;

    const now = new Date();
    if (this.displayStart && now < this.displayStart) return false;
    if (this.displayEnd && now > this.displayEnd) return false;

    return true;
});

categorySchema.virtual('childCount', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent',
    count: true
});

categorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

categorySchema.virtual('fullPath').get(function() {
    // سيتم حساب المسار الكامل بشكل متكرر
    return this.getFullPath();
});

// الفهرس للأداء
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ status: 1, visibility: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ 'stats.productCount': -1 });
categorySchema.index({ createdAt: -1 });

// الطرق المخصصة
categorySchema.methods = {
    // الحصول على المسار الكامل للتصنيف
    async getFullPath() {
        const path = [this.name];
        let current = this;

        while (current.parent) {
            current = await mongoose.model('Category').findById(current.parent);
            if (current) {
                path.unshift(current.name);
            } else {
                break;
            }
        }

        return path.join(' › ');
    },

    // زيادة عدد المنتجات
    async incrementProductCount(amount = 1) {
        this.stats.productCount += amount;
        return this.save();
    },

    // زيادة عدد المشاهدات
    async incrementViewCount() {
        this.stats.viewCount += 1;
        return this.save();
    },

    // زيادة عدد المشتريات
    async incrementPurchaseCount(amount = 1) {
        this.stats.purchaseCount += amount;
        return this.save();
    },

    // التحقق من إمكانية الوصول
    canUserAccess(user) {
        if (this.visibility === 'private') {
            return this.accessControl.allowedRoles.includes(user.role);
        }

        if (this.accessControl.requiresVerification && !user.isVerified) {
            return false;
        }

        if (this.accessControl.minOrderAmount > 0) {
            // التحقق من الحد الأدنى للطلبات
            // سيتم تنفيذ هذا في التطبيق الحقيقي
        }

        return true;
    },

    // الحصول على جميع المنتجات في هذا التصنيف
    async getProducts(options = {}) {
        const Product = mongoose.model('Product');
        const query = {
            categories: this._id,
            status: 'active',
            visibility: 'public'
        };

        return Product.find(query)
            .sort(options.sort || { createdAt: -1 })
            .limit(options.limit || 50)
            .populate('categories');
    }
};

// الاستعلامات الثابتة
categorySchema.statics = {
    // الحصول على التصنيفات النشطة
    findActive() {
        return this.find({
            status: 'active',
            visibility: 'public'
        }).sort({ order: 1, name: 1 });
    },

    // الحصول على التصنيفات مع عدد المنتجات
    async findWithProductCount() {
        return this.aggregate([{
                $match: {
                    status: 'active',
                    visibility: 'public'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    let: { categoryId: '$_id' },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $in: ['$$categoryId', '$categories']
                                },
                                status: 'active',
                                visibility: 'public'
                            }
                        },
                        {
                            $count: 'productCount'
                        }
                    ],
                    as: 'productInfo'
                }
            },
            {
                $addFields: {
                    productCount: {
                        $ifNull: [{ $arrayElemAt: ['$productInfo.productCount', 0] }, 0]
                    }
                }
            },
            {
                $project: {
                    productInfo: 0
                }
            },
            {
                $sort: { order: 1, name: 1 }
            }
        ]);
    },

    // الحصول على الشجرة الكاملة للتصنيفات
    async getCategoryTree() {
        const buildTree = (parentId = null) => {
            const query = parentId ? { parent: new mongoose.Types.ObjectId(parentId), status: 'active' } : { parent: null, status: 'active' };
            return this.find(query)
                .sort({ order: 1, name: 1 })
                .lean()
                .then(async categories => {
                    for (let category of categories) {
                        category.children = await buildTree(category._id);
                    }
                    return categories;
                });
        };

        return buildTree();
    },

    // البحث في التصنيفات
    searchCategories(query, options = {}) {
        const searchQuery = {
            status: 'active',
            visibility: 'public',
            $text: { $search: query }
        };

        return this.find(searchQuery)
            .sort({ score: { $meta: 'textScore' } })
            .limit(options.limit || 10);
    },

    // الحصول على التصنيفات الأكثر شيوعاً
    getPopularCategories(limit = 10) {
        return this.find({ status: 'active' })
            .sort({ 'stats.viewCount': -1, 'stats.productCount': -1 })
            .limit(limit);
    },

    // التحقق من وجود تصنيف بالاسم
    async existsWithName(name) {
        const encryptedName = SecurityUtils.encrypt(name);
        const count = await this.countDocuments({ name: encryptedName });
        return count > 0;
    }
};

// Middleware بعد الحذف
categorySchema.post('remove', async function(doc) {
    try {
        // نقل المنتجات إلى تصنيف افتراضي أو حذفها
        const Product = mongoose.model('Product');
        await Product.updateMany({ categories: doc._id }, { $pull: { categories: doc._id } });

        // نقل التصنيفات الفرعية إلى التصنيف الأب
        await this.updateMany({ parent: doc._id }, { $set: { parent: doc.parent } });

    } catch (error) {
        console.error('Error in category post-remove middleware:', error);
    }
});

export default mongoose.model('Category', categorySchema);