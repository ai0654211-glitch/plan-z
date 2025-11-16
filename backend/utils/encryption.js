import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Derive a 32-byte key from the provided ENCRYPTION_KEY using SHA-256
const KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default_encryption_key').digest();

export class SecurityUtils {

    // تشفير البيانات الحساسة
    static encrypt(text) {
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
        } catch (error) {
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    // فك تشفير البيانات
    static decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const authTag = Buffer.from(parts[2], 'hex');

            const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    }

    // تشفير كلمات المرور
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(12);
        return await bcrypt.hash(password, salt);
    }

    // التحقق من كلمات المرور
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // توليد توكن عشوائي آمن
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // توقيع البيانات
    static signData(data) {
        const signingKey = process.env.DATA_SIGNING_KEY || '';
        const hmac = crypto.createHmac('sha256', signingKey);
        return hmac.update(data).digest('hex');
    }

    // التحقق من توقيع البيانات
    static verifySignature(data, signature) {
        return this.signData(data) === signature;
    }
}