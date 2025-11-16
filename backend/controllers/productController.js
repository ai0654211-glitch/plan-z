import Product from '../models/Product.js';
import ValidationUtils from '../utils/validation.js';
import AuditLogger from '../middleware/audit.js';
import { SecurityUtils } from '../utils/encryption.js';

export class ProductController {

    // الحصول على جميع المنتجات مع فلترة وترتيب متقدم
    static async getProducts(req, res) {
        try {
            const {
                page = 1,
                    limit = 12,
                    sortBy = 'createdAt',
                    sortOrder = 'desc',
                    category,
                    minPrice,
                    maxPrice,
                    inStock,
                    search,
                    rating
            } = req.query;

            // بناء query آمن
            const query = {
                status: 'active',
                visibility: 'public'
            };

            // فلترة حسب التصنيف
            if (category && ValidationUtils.isValidObjectId(category)) {
                query.categories = category;
            }

            // فلترة حسب السعر
            if (minPrice || maxPrice) {
                query['pricing.price'] = {};
                if (minPrice) query['pricing.price'].$gte = parseFloat(minPrice);
                if (maxPrice) query['pricing.price'].$lte = parseFloat(maxPrice);
            }

            // فلترة حسب التوفر
            if (inStock === 'true') {
                query.$or = [
                    { 'inventory.quantity': { $gt: 0 } },
                    { 'inventory.allowBackorder': true }
                ];
            }

            // فلترة حسب التقييم
            if (rating) {
                query['ratings.average'] = { $gte: parseFloat(rating) };
            }

            // بحث نصي آمن
            if (search && search.trim().length > 0) {
                const sanitizedSearch = ValidationUtils.sanitizeString(search);
                query.$text = { $search: sanitizedSearch };
            }

            // options للاستعلام
            const options = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 50), // حد أقصى 50
                sort: {
                    [sortBy]: sortOrder === 'desc' ? -1 : 1
                },
                populate: 'categories'
            };

            // تنفيذ الاستعلام
            const products = await Product.find(query)
                .sort(options.sort)
                .limit(options.limit)
                .skip((options.page - 1) * options.limit)
                .populate('categories')
                .select('-seo.metaKeywords -description');

            const total = await Product.countDocuments(query);

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('PRODUCTS_ACCESS', {
                ip: req.ip,
                filters: { category, minPrice, maxPrice, search },
                results: products.length
            });

            res.json({
                success: true,
                products,
                pagination: {
                    page: options.page,
                    limit: options.limit,
                    total,
                    pages: Math.ceil(total / options.limit)
                },
                filters: {
                    applied: { category, minPrice, maxPrice, search },
                    available: await this.getAvailableFilters()
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PRODUCTS_ACCESS_ERROR', {
                error: error.message,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Failed to fetch products',
                code: 'PRODUCTS_FETCH_ERROR'
            });
        }
    }

    // الحصول على منتج بواسطة ID
    static async getProductById(req, res) {
        try {
            const { id } = req.params;

            if (!ValidationUtils.isValidObjectId(id)) {
                return res.status(400).json({
                    error: 'Invalid product ID',
                    code: 'INVALID_PRODUCT_ID'
                });
            }

            const product = await Product.findById(id)
                .populate('categories')
                .populate('vendor', 'personalInfo createdAt');

            if (!product) {
                return res.status(404).json({
                    error: 'Product not found',
                    code: 'PRODUCT_NOT_FOUND'
                });
            }

            // زيادة عدد المشاهدات
            await product.incrementViews();

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('PRODUCT_VIEW', {
                productId: id,
                ip: req.ip,
                userId: req.userId
            });

            res.json({
                success: true,
                product
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PRODUCT_VIEW_ERROR', {
                error: error.message,
                productId: req.params.id,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Failed to fetch product',
                code: 'PRODUCT_FETCH_ERROR'
            });
        }
    }

    // إنشاء منتج جديد
    static async createProduct(req, res) {
        try {
            const productData = req.body;

            // تحقق مكثف من البيانات
            const validationResult = this.validateProductData(productData);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    error: validationResult.errors.join(', '),
                    code: 'PRODUCT_VALIDATION_ERROR'
                });
            }

            // تعيين البائع إذا كان مستخدم عادي
            if (req.userRole === 'user' || req.userRole === 'vendor') {
                productData.vendor = req.userId;
            }

            const product = new Product(productData);
            await product.save();

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('PRODUCT_CREATED', {
                productId: product._id,
                userId: req.userId,
                ip: req.ip
            });

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                product: {
                    id: SecurityUtils.encrypt(product._id.toString()),
                    name: product.name,
                    slug: product.seo.slug
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PRODUCT_CREATION_ERROR', {
                error: error.message,
                userId: req.userId,
                ip: req.ip
            });

            if (error.code === 11000) {
                return res.status(409).json({
                    error: 'Product with this SKU or slug already exists',
                    code: 'DUPLICATE_PRODUCT'
                });
            }

            res.status(500).json({
                error: 'Failed to create product',
                code: 'PRODUCT_CREATION_ERROR'
            });
        }
    }

    // تحديث منتج
    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ValidationUtils.isValidObjectId(id)) {
                return res.status(400).json({
                    error: 'Invalid product ID',
                    code: 'INVALID_PRODUCT_ID'
                });
            }

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({
                    error: 'Product not found',
                    code: 'PRODUCT_NOT_FOUND'
                });
            }

            // التحقق من الصلاحيات
            if (!this.canModifyProduct(req.userId, req.userRole, product)) {
                return res.status(403).json({
                    error: 'Insufficient permissions to modify this product',
                    code: 'PRODUCT_MODIFICATION_DENIED'
                });
            }

            // تحقق من البيانات
            const validationResult = this.validateProductData(updateData, true);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    error: validationResult.errors.join(', '),
                    code: 'PRODUCT_VALIDATION_ERROR'
                });
            }

            // التحديث
            Object.keys(updateData).forEach(key => {
                product[key] = updateData[key];
            });

            await product.save();

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('PRODUCT_UPDATED', {
                productId: id,
                userId: req.userId,
                ip: req.ip,
                updatedFields: Object.keys(updateData)
            });

            res.json({
                success: true,
                message: 'Product updated successfully',
                product: {
                    id: SecurityUtils.encrypt(product._id.toString()),
                    name: product.name
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PRODUCT_UPDATE_ERROR', {
                error: error.message,
                productId: req.params.id,
                userId: req.userId,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Failed to update product',
                code: 'PRODUCT_UPDATE_ERROR'
            });
        }
    }

    // حذف منتج
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            if (!ValidationUtils.isValidObjectId(id)) {
                return res.status(400).json({
                    error: 'Invalid product ID',
                    code: 'INVALID_PRODUCT_ID'
                });
            }

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({
                    error: 'Product not found',
                    code: 'PRODUCT_NOT_FOUND'
                });
            }

            // التحقق من الصلاحيات
            if (!this.canModifyProduct(req.userId, req.userRole, product)) {
                return res.status(403).json({
                    error: 'Insufficient permissions to delete this product',
                    code: 'PRODUCT_DELETION_DENIED'
                });
            }

            // حذف منطقي (أرشفة) بدلاً من الحذف الفعلي
            product.status = 'archived';
            await product.save();

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('PRODUCT_DELETED', {
                productId: id,
                userId: req.userId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Product archived successfully'
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PRODUCT_DELETION_ERROR', {
                error: error.message,
                productId: req.params.id,
                userId: req.userId,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Failed to delete product',
                code: 'PRODUCT_DELETION_ERROR'
            });
        }
    }

    // التحقق من إمكانية تعديل المنتج
    static canModifyProduct(userId, userRole, product) {
        if (userRole === 'admin' || userRole === 'super_admin') {
            return true;
        }

        if (userRole === 'vendor' && product.vendor.toString() === userId) {
            return true;
        }

        return false;
    }

    // تحقق من بيانات المنتج
    static validateProductData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate || data.name !== undefined) {
            if (!data.name || data.name.trim().length < 2) {
                errors.push('Product name must be at least 2 characters long');
            }
            if (data.name && data.name.length > 200) {
                errors.push('Product name cannot exceed 200 characters');
            }
        }

        if (!isUpdate || data.description !== undefined) {
            if (!data.description || data.description.trim().length < 10) {
                errors.push('Product description must be at least 10 characters long');
            }
        }

        if (!isUpdate || data.pricing !== undefined) {
            if (data.pricing && data.pricing.price !== undefined) {
                if (data.pricing.price < 0) {
                    errors.push('Price cannot be negative');
                }
                if (data.pricing.price > 1000000) {
                    errors.push('Price cannot exceed 1,000,000');
                }
            }
        }

        if (data.inventory && data.inventory.quantity !== undefined) {
            if (data.inventory.quantity < 0) {
                errors.push('Quantity cannot be negative');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // الحصول on الفلاتر المتاحة
    static async getAvailableFilters() {
        const [minPrice, maxPrice, categories] = await Promise.all([
            Product.findOne({ status: 'active' }).sort({ 'pricing.price': 1 }).select('pricing.price'),
            Product.findOne({ status: 'active' }).sort({ 'pricing.price': -1 }).select('pricing.price'),
            Product.distinct('categories', { status: 'active' })
        ]);

        return {
            priceRange: {
                min: minPrice && minPrice.pricing && typeof minPrice.pricing.price === 'number' ? minPrice.pricing.price : 0,
                max: maxPrice && maxPrice.pricing && typeof maxPrice.pricing.price === 'number' ? maxPrice.pricing.price : 1000
            },
            categories: Array.isArray(categories) ? categories.length : 0
        };
    }
}

export default ProductController;