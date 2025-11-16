import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from '../../src/components/products/ProductCard';
import { CartProvider } from '../../src/contexts/CartContext';

describe('ProductCard', () => {
  const mockProduct = {
    _id: '1',
    name: 'Test Product',
    price: 99.99,
    image: 'test-image.jpg',
    rating: 4.5,
    inStock: true,
  };

  it('يعرض معلومات المنتج بشكل صحيح', () => {
    render(
      <CartProvider>
        <ProductCard product={mockProduct} />
      </CartProvider>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByAltText('Test Product')).toBeInTheDocument();
  });

  it('يضيف المنتج إلى السلة عند النقر', () => {
    render(
      <CartProvider>
        <ProductCard product={mockProduct} />
      </CartProvider>
    );

    const addButton = screen.getByText('أضف إلى السلة');
    fireEvent.click(addButton);

    // يمكن إضافة اختبارات أكثر تقدمًا هنا
  });
});