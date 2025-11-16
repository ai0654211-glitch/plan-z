const cors = require('cors');

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://yourdomain.com',
    'https://www.yourdomain.com',
];

const corsOptions = {
    origin: function(origin, callback) {
        // السماح لطلبات بدون origin (مثل mobile apps أو curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);