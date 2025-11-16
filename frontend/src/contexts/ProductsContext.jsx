import React, { createContext, useContext, useState, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Simulate API call with mock data
        const mockProducts = [
          {
            id: 1,
            name: 'iPhone 14 Pro',
            price: 999,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            rating: 4.8,
            inStock: true,
            description: 'أحدث هاتف من Apple بشريحة A16 بايونيك'
          },
          {
            id: 2,
            name: 'MacBook Pro',
            price: 1999,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            rating: 4.9,
            inStock: true,
            description: 'جهاز MacBook Pro بشريحة M2 Pro'
          },
          {
            id: 3,
            name: 'AirPods Pro',
            price: 249,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400',
            rating: 4.7,
            inStock: true,
            description: 'سماعات لاسلكية بتقنية إلغاء الضوضاء'
          },
          {
            id: 4,
            name: 'Apple Watch',
            price: 399,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1579586337278-3f43610277a5?w=400',
            rating: 4.6,
            inStock: false,
            description: 'ساعة Apple Watch Series 8'
          }
        ];

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        setProducts(mockProducts);
        
      } catch (err) {
        setError('فشل في تحميل المنتجات');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getProductById = (id) => {
    return products.find(product => product.id === parseInt(id));
  };

  const getProductsByCategory = (category) => {
    return products.filter(product => product.category === category);
  };

  const value = {
    products,
    loading,
    error,
    getProductById,
    getProductsByCategory
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};