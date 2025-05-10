// screens/Index.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  Modal, StyleSheet, TextInput, ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToCart } from '../redux/slices/cartSlice';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { fetchProducts } from '../redux/slices/productsSlice';

const Index = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    products,
    categories: rawCategories,
    loading: productsLoading,
    error: productsError
  } = useSelector(state => state.products);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentCategory, setCurrentCategory] = useState({ id: 'All', name: 'All', subcategories: [] });
  const [currentSubcategory, setCurrentSubcategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // reshape incoming categories so they have .name
  const formattedCategories = useMemo(() => {
    const cats = Array.isArray(rawCategories)
      ? rawCategories.map(c => ({
          id: c.id,
          name: c.categoryName || 'Unknown',
          subcategories: Array.isArray(c.subcategories) ? c.subcategories : []
        }))
      : [];
    return [{ id: 'All', name: 'All', subcategories: [] }, ...cats];
  }, [rawCategories]);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? [...products] : [];

    const extractId = val => (val && typeof val === 'object' ? String(val.id ?? '') : String(val ?? ''));

    if (currentCategory.id !== 'All') {
      const cid = String(currentCategory.id);
      list = list.filter(p => extractId(p.category) === cid);
    }
    if (currentSubcategory) {
      const sid = String(currentSubcategory.id);
      list = list.filter(p => extractId(p.subcategory) === sid);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(p => (p.name || '').toLowerCase().includes(term));
    }
    return list;
  }, [products, currentCategory, currentSubcategory, searchTerm]);

  const handleCategoryClick = cat => {
    setSearchTerm('');
    setCurrentSubcategory(null);
    setCurrentCategory(cat);
    setSelectedProduct(null);            // clear any modal
  };
  const handleSubcategoryClick = sub => {
    setCurrentSubcategory(sub);
    setSelectedProduct(null);
  };
  const handleProductClick = product => {
    setSelectedProduct({ ...product, quantity: 1 });
    setShowModal(true);
  };
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    dispatch(addItemToCart({
      product: {
        id: selectedProduct.id || uuidv4(),
        quantity: selectedProduct.quantity
      }
    }));
    setShowModal(false);
    setSelectedProduct(null);
  };

  if (productsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5a2428" />
        <Text style={styles.loadingText}>Loading products…</Text>
      </View>
    );
  }

  if (productsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{productsError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchProducts())}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arpella Stores</Text>
        <TouchableOpacity onPress={() => router.push('./cart')}>
          <FontAwesome name="shopping-cart" size={24} />
        </TouchableOpacity>
      </View>

      {/* search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search products…"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* category nav */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          data={formattedCategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleCategoryClick(item)}
              style={[
                styles.categoryButton,
                currentCategory.id === item.id && styles.categoryButtonActive
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory.id === item.id && styles.categoryButtonTextActive
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* subcategory nav */}
      {currentCategory.id !== 'All' && currentCategory.subcategories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <FlatList
            data={currentCategory.subcategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.filterContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSubcategoryClick(item)}
                style={[
                  styles.categoryButton,
                  currentSubcategory?.id === item.id && styles.categoryButtonActive
                ]}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    currentSubcategory?.id === item.id && styles.categoryButtonTextActive
                  ]}
                >
                  {item.name || 'Unknown'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* product grid */}
      <View style={styles.productsContainer}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            extraData={[currentCategory, currentSubcategory, searchTerm]}   // <-- force re-render
            numColumns={2}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cardContainer}
                onPress={() => handleProductClick(item)}
              >
                <View style={styles.card}>
                  <Image
                    source={{ uri: item.productimages?.[0]?.imageUrl || 'https://via.placeholder.com/150' }}
                    style={styles.image}
                  />
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productPrice}>KSH {item.price}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* product modal */}
      {selectedProduct && (
        <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <FontAwesome name="close" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
            <Image
              source={{ uri: selectedProduct.productimages?.[0]?.imageUrl || 'https://via.placeholder.com/150' }}
              style={styles.modalImage}
            />
            <Text style={styles.modalPrice}>KSH {selectedProduct.price}</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
              <TouchableOpacity
                onPress={() => setSelectedProduct(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddToCart}>
              <Text style={styles.actionButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* bottom nav */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="home" size={24} color="blue"/>
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Package')}>
          <FontAwesome name="ticket" size={24} />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <FontAwesome name="user" size={24} />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', paddingHorizontal: 15, paddingTop: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  headerTitle: { fontSize: 25, fontWeight: 'bold' },
  searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' },

  categoriesWrapper: { height: 40, marginBottom: 8 },
  filterContainer: { paddingVertical: 3, paddingHorizontal: 5 },
  categoryButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 5, backgroundColor: '#fff', elevation: 2, minWidth: 70, alignItems: 'center' },
  categoryButtonActive: { backgroundColor: '#5a2428' },
  categoryButtonText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  categoryButtonTextActive: { color: '#fff' },

  productsContainer: { flex: 1, marginBottom: 10 },
  cardContainer: { flex: 1, margin: 8 },
  card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', padding: 3, alignItems: 'center', elevation: 3 },
  image: { width: '100%', height: 150, marginBottom: 8, resizeMode: 'cover' },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', paddingHorizontal: 5 },
  productPrice: { fontSize: 14, color: '#888', textAlign: 'center' },

  modalContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 20 },
  closeButton: { position: 'absolute', top: 20, right: 20, padding: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  modalImage: { width: 200, height: 200, resizeMode: 'contain', marginBottom: 20 },
  modalPrice: { fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  quantityButton: { width: 40, height: 40, borderRadius: 5, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, elevation: 2 },
  quantityButtonText: { fontSize: 18, fontWeight: 'bold' },
  quantityText: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'center' },
  actionButton: { width: '80%', padding: 15, backgroundColor: '#5a2428', borderRadius: 5, alignItems: 'center', elevation: 3 },
  actionButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  bottomNavigation: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#5a2428' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#5a2428', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
});

export default Index;
