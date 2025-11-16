import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const reviewSchema = new mongoose.Schema({
    // العلاقات الأساسية
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required for review']
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required for review']
    },

    // التقييم الأساسي
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        validate: {
            validator: Number.isInteger,
            message: 'Rating must be an integer'
        }
    },

    // المراجعة النصية
    title: {
        type: String,
        trim: true,
        maxlength: [200, 'Review title cannot exceed 200 characters'],
        set: (title) => SecurityUtils.encrypt(title)
    },

    comment: {
        type: String,
        trim: true,
        maxlength: [2000, 'Review comment cannot exceed 2000 characters'],
        set: (comment) => SecurityUtils.encrypt(comment)
    },

    // الوسائط
    images: [{
        url: String,
        alt: String,
        caption: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // تفاصيل إضافية
    verifiedPurchase: {
        type: Boolean,
        default: false
    },

    usageDuration: {
        type: String,
        enum: ['less_than_week', '1_4_weeks', '1_3_months', '3_6_months', 'more_than_6_months'],
        default: null
    },

    // التوصية
    wouldRecommend: {
        type: Boolean,
        default: null
    },

    // نقاط القوة والضعف
    pros: [{
        type: String,
        set: (pro) => SecurityUtils.encrypt(pro)
    }],

    cons: [{
        type: String,
        set: (con) => SecurityUtils.encrypt(con)
    }],

    // التفاعل الاجتماعي
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        likedAt: {
            type: Date,
            default: Date.now
        }
    }],

    likesCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // التقارير والإبلاغ
    reports: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'spam',
                'inappropriate',
                'false_information',
                'harassment',
                'other'
            ]
        },
        description: String,
        reportedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            default: 'pending'
        }
    }],

    reportsCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // الموافقة والمراجعة
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending'
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    approvedAt: Date,

    rejectionReason: {
        type: String,
        set: (reason) => SecurityUtils.encrypt(reason)
    },

    // التحليلات
    helpfulness: {
        helpful: {
            type: Number,
            default: 0,
            min: 0
        },
        notHelpful: {
            type: Number,
            default: 0,
            min: 0
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    viewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    shareCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // الأمان والتحقق
    verification: {
        ipAddress: {
            type: String,
            set: (ip) => SecurityUtils.encrypt(ip)
        },
        userAgent: String,
        location: {
            country: String,
            city: String,
            region: String
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },

    // التعديلات والتحديثات
    edits: [{
        previousTitle: String,
        previousComment: String,
        editedAt: {
            type: Date,
            default: Date.now
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String
    }],

    isEdited: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // فك تشفير البيانات النصية
            if (ret.title) ret.title = SecurityUtils.decrypt(ret.title);
            if (ret.comment) ret.comment = SecurityUtils.decrypt(ret.comment);
            if (ret.rejectionReason) ret.rejectionReason = SecurityUtils.decrypt(ret.rejectionReason);
            if (ret.pros) ret.pros = ret.pros.map(pro => SecurityUtils.decrypt(pro));
            if (ret.cons) ret.cons = ret.cons.map(con => SecurityUtils.decrypt(con));

            // إخفاء البيانات الحساسة
            delete ret.verification;
            delete ret.reports;
            delete ret.edits;
            delete ret.approvedBy;

            return ret;
        }
    }
});

// Middleware قبل الحفظ
reviewSchema.pre('save', function(next) {
    // حساب درجة المساعدة
    if (this.isModified('helpfulness.helpful') || this.isModified('helpfulness.notHelpful')) {
        const total = this.helpfulness.helpful + this.helpfulness.notHelpful;
        this.helpfulness.score = total > 0 ?
            (this.helpfulness.helpful / total) * 100 : 0;
    }

    // تحديث عدد الإعجابات
    if (this.isModified('likes')) {
        this.likesCount = this.likes.length;
    }

    // تحديث عدد التقارير
    if (this.isModified('reports')) {
        this.reportsCount = this.reports.length;

        // وضع علامة إذا كان هناك تقارير كثيرة
        if (this.reportsCount >= 5 && this.status !== 'flagged') {
            this.status = 'flagged';
        }
    }

    // التحقق من التقييم المزدوج
    if (this.isNew) {
        this.checkForDuplicateReview().then(isDuplicate => {
            if (isDuplicate) {
                return next(new Error('User has already reviewed this product'));
            }
            next();
        }).catch(next);
    } else {
        next();
    }
});

// الفهرس للأداء
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ 'helpfulness.score': -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ verifiedPurchase: 1 });

// Virtuals
reviewSchema.virtual('isActive').get(function() {
    return this.status === 'approved';
});

reviewSchema.virtual('ageInDays').get(function() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// الطرق المخصصة
reviewSchema.methods = {
    // التحقق من التقييم المزدوج
    async checkForDuplicateReview() {
        const count = await this.constructor.countDocuments({
            product: this.product,
            user: this.user,
            _id: { $ne: this._id }
        });
        return count > 0;
    },

    // إضافة إعجاب
    async addLike(userId) {
        const existingLike = this.likes.find(like =>
            like.user.toString() === userId.toString()
        );

        if (existingLike) {
            // إزالة الإعجاب إذا كان موجوداً
            this.likes = this.likes.filter(like =>
                like.user.toString() !== userId.toString()
            );
        } else {
            // إضافة إعجاب جديد
            this.likes.push({
                user: userId,
                likedAt: new Date()
            });
        }

        await this.save();
        return !existingLike; // يعيد true إذا تم الإعجاب، false إذا تم إزالته
    },

    // الإبلاغ عن التقييم
    async report(userId, reason, description = '') {
        const existingReport = this.reports.find(report =>
            report.user.toString() === userId.toString()
        );

        if (existingReport) {
            throw new Error('User has already reported this review');
        }

        this.reports.push({
            user: userId,
            reason,
            description,
            reportedAt: new Date()
        });

        await this.save();
    },

    // تحديث التقييم
    async updateReview(updateData, userId) {
        // حفظ البيانات السابقة
        this.edits.push({
            previousTitle: this.title,
            previousComment: this.comment,
            editedAt: new Date(),
            editedBy: userId,
            reason: updateData.reason || 'User edit'
        });

        // تحديث البيانات
        if (updateData.title !== undefined) this.title = updateData.title;
        if (updateData.comment !== undefined) this.comment = updateData.comment;
        if (updateData.rating !== undefined) this.rating = updateData.rating;

        this.isEdited = true;

        await this.save();
    },

    // الموافقة على التقييم
    async approve(adminId) {
        this.status = 'approved';
        this.approvedBy = adminId;
        this.approvedAt = new Date();
        await this.save();
    },

    // رفض التقييم
    async reject(adminId, reason) {
        this.status = 'rejected';
        this.rejectionReason = reason;
        await this.save();
    },

    // زيادة عدد المشاهدات
    async incrementViewCount() {
        this.viewCount += 1;
        await this.save();
    }
};

// الاستعلامات الثابتة
reviewSchema.statics = {
    // الحصول على التقييمات المعتمدة لمنتج
    findApprovedForProduct(productId, options = {}) {
        const query = {
            product: productId,
            status: 'approved'
        };

        return this.find(query)
            .populate('user', 'personalInfo firstName lastName')
            .sort(options.sort || { 'helpfulness.score': -1, createdAt: -1 })
            .limit(options.limit || 10)
            .skip(options.skip || 0);
    },

    // الحصول على متوسط التقييم لمنتج
    async getAverageRating(productId) {
        const result = await this.aggregate([{
                $match: {
                    product: new mongoose.Types.ObjectId(productId),
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: '$product',
                    averageRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        return result[0] || { averageRating: 0, reviewCount: 0, ratingDistribution: [] };
    },

    // الحصول على التقييمات التي تحتاج مراجعة
    findPendingReviews(options = {}) {
        return this.find({ status: 'pending' })
            .populate('product', 'name')
            .populate('user', 'personalInfo firstName lastName email')
            .sort({ createdAt: 1 })
            .limit(options.limit || 50);
    },

    // الحصول على التقييمات الأكثر فائدة
    findMostHelpful(productId, limit = 5) {
        return this.find({
                product: productId,
                status: 'approved',
                'helpfulness.score': { $gte: 70 }
            })
            .sort({ 'helpfulness.score': -1, createdAt: -1 })
            .limit(limit)
            .populate('user', 'personalInfo firstName lastName');
    },

    // التحقق من إمكانية المستخدم لتقييم المنتج
    async canUserReview(productId, userId) {
        const existingReview = await this.findOne({
            product: productId,
            user: userId
        });

        return !existingReview;
    },

    // إحصائيات التقييمات
    async getReviewStats(productId = null) {
        const matchStage = productId ? { product: new mongoose.Types.ObjectId(productId) } : {};

        const stats = await this.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        return stats;
    }
};

export default mongoose.model('Review', reviewSchema);