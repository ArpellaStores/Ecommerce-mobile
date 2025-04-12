import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToCart } from '../redux/slices/cartSlice';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { fetchProducts } from '../redux/slices/productsSlice';

const baseUrl = 'http://arpella-001.runasp.net';

const Index = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCategory, setCurrentCategory] = useState({ id: 'All', name: 'All' });
  const [currentSubcategory, setCurrentSubcategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dispatch = useDispatch();
  const router = useRouter();

  
  const cart = useSelector((state) => state.cart?.items || {});
  
  // Format categories to include 'All' option
  const formattedCategories = useMemo(() => {
    return [{ id: 'All', name: 'All' }, ...(Array.isArray(categories) ? categories : [])];
  }, [categories]);

  // Load products on mount
  useEffect(() => {
    setLoading(true);
    console.log("🔄 Dispatching fetchProducts action");
    
    dispatch(fetchProducts())
      .unwrap()
      .then((result) => {
        console.log("✅ Products fetch successful:", result);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Error fetching products:', err);
        setError('Failed to load products');
        setLoading(false);
      });
  }, [dispatch]);

  // Debug logging to see what's coming from Redux
  useEffect(() => {
    console.log('Products from Redux:', products);
    console.log('Categories from Redux:', categories);
    console.log('Redux Loading State:', productsLoading);
    console.log('Redux Error State:', productsError);
  }, [products, categories, productsLoading, productsError]);

  const { 
    products = [], 
    categories = [], 
    loading: productsLoading = false, 
    error: productsError = null 
  } = useSelector((state) => {
    console.log("Full Redux state:", state);
    console.log("Products slice:", state.products);
    return state.products || {};
  });
  
  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) {
      console.log("No products to filter or products is not an array");
      return [];
    }
    
    console.log(`Filtering ${products.length} products`);
    let filtered = [...products];

    // Only filter if a specific category is chosen
    if (currentCategory && currentCategory.id !== 'All') {
      filtered = filtered.filter((product) => {
        const productCategory = String(product.category);
        const targetCategory = String(currentCategory.id);
        return productCategory === targetCategory;
      });
      console.log(`After category filter (${currentCategory.id}): ${filtered.length} products`);
    }

    if (currentSubcategory) {
      filtered = filtered.filter((product) => {
        const productSubcat = String(product.subcategory);
        const targetSubcat = String(currentSubcategory.id);
        return productSubcat === targetSubcat;
      });
      console.log(`After subcategory filter: ${filtered.length} products`);
    }

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter((product) => {
        const productName = (product.name || product.Name || '').toLowerCase();
        return productName.includes(searchTerm.toLowerCase());
      });
      console.log(`After search filter: ${filtered.length} products`);
    }

    return filtered;
  }, [searchTerm, currentCategory, currentSubcategory, products]);

  // Event handlers
  const handleCategoryClick = (category) => {
    console.log("Selected category:", category);
    setSearchTerm('');
    setCurrentSubcategory(null);
    setCurrentCategory(category);
  };

  const handleSubcategoryClick = (subcategory) => {
    console.log("Selected subcategory:", subcategory);
    setSearchTerm('');
    setCurrentSubcategory(subcategory);
  };

  const handleProductClick = (product) => {
    console.log("Selected product:", product);
    const cartItem = cart[product.id];
    setSelectedProduct({
      ...product,
      quantity: cartItem ? cartItem.quantity : 1,
    });
    setShowModal(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const productWithId = { ...selectedProduct, id: selectedProduct.id || uuidv4() };
    dispatch(addItemToCart({ product: { id: productWithId.id, quantity: productWithId.quantity } }));
    setShowModal(false);
    setSelectedProduct(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  // Determine if we actually have products to display
  const hasProducts = Array.isArray(filteredProducts) && filteredProducts.length > 0;
  const displayedProducts = hasProducts ? filteredProducts : [];

  // For debugging
  console.log(`Final products to display: ${displayedProducts.length}`);

  return (
    <View style={styles.container}>
      {/* Backdrop Spinner */}
      {(loading || productsLoading) && (
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arpella Stores</Text>
        <TouchableOpacity onPress={() => router.push('./cart')}>
          <FontAwesome name="shopping-cart" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={searchTerm}
        onChangeText={(text) => {
          console.log("Search term updated:", text);
          setSearchTerm(text);
        }}
      />

      <View style={styles.categoriesContainer}>
        <FlatList
          data={formattedCategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id || 'unknown')}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleCategoryClick(item)}
              style={[
                styles.categoryButton,
                currentCategory.id === item.id && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory.id === item.id && styles.categoryButtonTextActive,
                ]}
              >
                {item.name || 'Unknown'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {currentCategory.id !== 'All' && Array.isArray(currentCategory.subcategories) && currentCategory.subcategories.length > 0 && (
        <FlatList
          data={currentCategory.subcategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id || 'unknown')}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSubcategoryClick(item)}
              style={[
                styles.categoryButton,
                currentSubcategory?.id === item.id && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  currentSubcategory?.id === item.id && styles.categoryButtonTextActive,
                ]}
              >
                {item.name || 'Unknown'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.categoryTitle}>
        {currentCategory.id === 'All' ? 'ALL PRODUCTS' : currentCategory.name}
        {currentSubcategory ? ` - ${currentSubcategory.name}` : ''}
      </Text>

      {error || productsError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || productsError || 'Failed to load products'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              dispatch(fetchProducts());
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubText}>
            {Array.isArray(products) && products.length > 0 
              ? 'Try changing your filter criteria' 
              : 'There might be an issue loading products'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProductClick(item)} style={styles.cardContainer}>
              <View style={styles.card}>
                <Image
                  source={{
                    uri: item.productimages?.[0]?.imageUrl || item.imageUrl || item.Image || 'https://via.placeholder.com/150',
                  }}
                  style={styles.image}
                  defaultSource={require('../assets/images/logo.jpeg')}
                />
                <Text style={styles.productName}>{item.name || item.Name || 'Unknown Product'}</Text>
                <Text style={styles.productPrice}>KSH {item.price || item.Price || 0}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => String(item.id || Math.random().toString())}
        />
      )}

      {selectedProduct && (
        <Modal visible={showModal} onRequestClose={closeModal} animationType="slide">
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{selectedProduct.name || selectedProduct.Name || 'Product'}</Text>
            <Image
              source={{
                uri:
                  selectedProduct.productimages?.[0]?.imageUrl ||
                  selectedProduct.imageUrl ||
                  selectedProduct.Image ||
                  'https://via.placeholder.com/150',
              }}
              style={styles.modalImage}
              defaultSource={require('../assets/images/logo.jpeg')}
            />
            <Text style={styles.modalPrice}>
              Price: KSH {selectedProduct.price || selectedProduct.Price || 0}
            </Text>

            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct((prev) => ({
                    ...prev,
                    quantity: Math.max(1, prev.quantity - 1),
                  }))
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct((prev) => ({
                    ...prev,
                    quantity: prev.quantity + 1,
                  }))
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleAddToCart}>
              <Text style={styles.actionButtonText}>Update Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('./cart')}>
              <Text style={styles.actionButtonText}>Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./home')}>
          <FontAwesome name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Package')}>
          <FontAwesome name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <FontAwesome name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 15,
    paddingTop: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  categoriesContainer: {
    height: 50,
    marginBottom: 10,
  },
  filterContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  categoryButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    elevation: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#5a2428',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    marginTop: 10,
  },
  cardContainer: {
    flex: 1,
    margin: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 3,
    alignItems: 'center',
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  productPrice: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  modalPrice: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 2,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    width: 30,
    textAlign: 'center',
  },
  actionButton: {
    width: '80%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#5a2428',
    borderRadius: 5,
    alignItems: 'center',
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#FFF8E1',
  },
  navItem: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5a2428',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#5a2428',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default Index;