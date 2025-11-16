# E-Commerce Project

مشروع متكامل للتجارة الإلكترونية مع Backend و Frontend حديث

## 📋 المحتوى

### Backend
- **Stack**: Express.js (ES Modules), MongoDB/Mongoose, JWT, bcryptjs
- **Security**: Helmet, CORS, Express Rate Limit, MongoDB Sanitize, XSS Clean
- **Features**: 
  - Authentication & Authorization
  - Product Management
  - Order Management
  - User Management
  - Security Events Logging
  - Data Encryption (AES-256-GCM)

### Frontend
- **Stack**: React 19, Vite, React Router 7, Axios, TailwindCSS
- **Features**:
  - Product Browsing & Filtering
  - Shopping Cart
  - User Authentication
  - Order Management
  - Secure Data Handling

## 🚀 البدء السريع

### Backend Setup

```bash
cd backend
npm install
npm start
```

يشتغل على: `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

يشتغل على: `http://localhost:5173` (أو `5174` إذا كان المنفذ مشغول)

## 📁 هيكل المشروع

```
.
├── backend/
│   ├── controllers/      # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   ├── config/          # Configuration
│   ├── index.js         # Entry point
│   └── server.js        # Express setup
└── frontend/
    ├── src/
    │   ├── pages/       # Page components
    │   ├── components/  # Reusable components
    │   ├── contexts/    # React contexts
    │   ├── services/    # API services
    │   ├── utils/       # Utilities
    │   └── styles/      # CSS files
    └── vite.config.js
```

## 🔐 الأمان

- JWT Authentication
- Password Hashing (bcryptjs)
- Data Encryption (AES-256-GCM)
- CORS Protection
- Rate Limiting
- Input Sanitization
- XSS Protection
- Security Event Logging

## 📦 Dependencies

### Backend
- express@5.1.0
- mongoose@8.19.3
- jsonwebtoken@9.0.2
- bcryptjs@3.0.3
- helmet@8.2.1
- cors@2.8.5

### Frontend
- react@19.2.0
- react-router-dom@7.9.5
- vite@7.2.2
- axios@1.13.2
- crypto-js@4.2.0
- tailwindcss@4.1.17

## 🔧 المتغيرات البيئية

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

## 📝 الترخيص

MIT License

## 👤 المطور

Created with ❤️

---

**آخر تحديث**: نوفمبر 2025
