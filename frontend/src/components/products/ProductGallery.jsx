import React from 'react';

const ProductGallery = ({ images = [] }) => (
    <div className="product-gallery">
        {images.length === 0 && <div className="no-images">No images</div>}
        {images.map((img, i) => (
            <img key={i} src={img.url || img} alt={`img-${i}`} className="gallery-img" />
        ))}
    </div>
);

export default ProductGallery;
