const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');

describe('Auth Controller', () => {
    describe('POST /api/auth/register', () => {
        it('ينشئ مستخدم جديد بنجاح', async() => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
        });

        it('يرفض إنشاء مستخدم موجود مسبقًا', async() => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            };

            // إنشاء المستخدم أولاً
            await User.create(userData);

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});