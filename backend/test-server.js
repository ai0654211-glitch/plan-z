import express from 'express';

const app = express();
const PORT = 5000;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Server is running'
    });
});

app.get('/api/reviews', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Great product!', rating: 5 },
            { id: 2, title: 'Good quality', rating: 4 }
        ]
    });
});

app.get('/api/offers', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: '50% Off', discount: 50 },
            { id: 2, title: 'Buy one get one', discount: 100 }
        ]
    });
});

app.get('/api/videos', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Product Tutorial', views: 1500 },
            { id: 2, title: 'Product Review', views: 800 }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`✅ Test Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/reviews');
    console.log('  - GET /api/offers');
    console.log('  - GET /api/videos');
});