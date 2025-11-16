import React from 'react';

const ProductReviews = ({ reviews = [] }) => (
    <div className="product-reviews">
        {reviews.length === 0 ? (
            <p>لا توجد تقييمات بعد.</p>
        ) : (
            reviews.map((r, i) => (
                <div key={i} className="review-item">
                    <strong>{r.author || 'مستخدم'}</strong>
                    <p>{r.comment}</p>
                </div>
            ))
        )}
    </div>
);

export default ProductReviews;
