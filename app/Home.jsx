// screens/Index.js

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

/**
 * Product Listing Screen
 * - Fetches and filters products by category, subcategory, and search term
 * - Supports adding items (with quantity) to the cart
 * - Provides navigation to Cart, Orders, and Profile
 */
const Index = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { products, categories: rawCategories, loading, error } = useSelector((s) => s.products);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentCategory, setCurrentCategory] = useState({ id: 'All', name: 'All', subcategories: [] });
  const [currentSubcategory, setCurrentSubcategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  /**
   * Format categories so each has .id, .name, .subcategories
   */
  const categories = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [{ id: 'All', name: 'All', subcategories: [] }];
    const formatted = rawCategories.map((c) => ({
      id: c.id,
      name: c.categoryName || 'Unknown',
      subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
    }));
    return [{ id: 'All', name: 'All', subcategories: [] }, ...formatted];
  }, [rawCategories]);

  /**
   * Fetch products on mount
   */
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  /**
   * Filter products by category, subcategory, and search term
   */
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? [...products] : [];

    const getId = (val) =>
      typeof val === 'object' ? String(val.id ?? '') : String(val ?? '');

    if (currentCategory.id !== 'All') {
      list = list.filter((p) => getId(p.category) === String(currentCategory.id));
    }
    if (currentSubcategory) {
      list = list.filter((p) => getId(p.subcategory) === String(currentSubcategory.id));
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((p) => (p.name || '').toLowerCase().includes(term));
    }
    return list;
  }, [products, currentCategory, currentSubcategory, searchTerm]);

  /**
   * Select a category (clears search and subcategory)
   */
  const onSelectCategory = (cat) => {
    setSearchTerm('');
    setCurrentSubcategory(null);
    setCurrentCategory(cat);
    setSelectedProduct(null);
  };

  /**
   * Open product modal with initial quantity
   */
  const onSelectProduct = (product) => {
    setSelectedProduct({ ...product, quantity: 1 });
    setModalVisible(true);
  };

  /**
   * Add selected product to cart
   */
  const onAddToCart = () => {
    if (!selectedProduct) return;
    dispatch(
      addItemToCart({
        product: {
          id: selectedProduct.id || uuidv4(),
          quantity: selectedProduct.quantity,
        },
      })
    );
    setModalVisible(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5a2428" />
        <Text style={styles.loadingText}>Loading products…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => dispatch(fetchProducts())}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Arpella Stores</Text>
        <TouchableOpacity onPress={() => router.push('./cart')}>
          <FontAwesome name="shopping-cart" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search products…"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {/* Category Tabs */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelectCategory(item)}
              style={[
                styles.filterButton,
                currentCategory.id === item.id && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  currentCategory.id === item.id && styles.filterTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Subcategory Tabs */}
      {currentCategory.id !== 'All' && currentCategory.subcategories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <FlatList
            data={currentCategory.subcategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.filterContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setCurrentSubcategory(item)}
                style={[
                  styles.filterButton,
                  currentSubcategory?.id === item.id && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    currentSubcategory?.id === item.id && styles.filterTextActive,
                  ]}
                >
                  {item.name || 'Unknown'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Product Grid */}
      <View style={styles.products}>
        {filteredProducts.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            extraData={[currentCategory, currentSubcategory, searchTerm]}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => onSelectProduct(item)}>
                <Image
                  source={{
                    uri: item.productimages?.[0]?.imageUrl || 'https://via.placeholder.com/150',
                  }}
                  style={styles.image}
                />
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>KSH {item.price}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Product Modal */}
      {selectedProduct && (
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.close} onPress={() => setModalVisible(false)}>
              <FontAwesome name="close" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
            <Image
              source={{
                uri: selectedProduct.productimages?.[0]?.imageUrl || 'https://via.placeholder.com/150',
              }}
              style={styles.modalImage}
            />
            <Text style={styles.modalPrice}>KSH {selectedProduct.price}</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))
                }
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{selectedProduct.quantity}</Text>
              <TouchableOpacity
                onPress={() => setSelectedProduct((p) => ({ ...p, quantity: p.quantity + 1 }))}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./')}>
          <FontAwesome name="home" size={24} color="blue" />
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
  title: { fontSize: 25, fontWeight: 'bold' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  categoriesWrapper: {
    height: 50,
    marginBottom: 10,
  },
  filterContainer: { alignItems: 'center', paddingHorizontal: 5 },
  filterButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    elevation: 2,
    minWidth: 70,
    alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: '#5a2428' },
  filterText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  filterTextActive: { color: '#fff' },
  products: { flex: 1, marginBottom: 10 },
  card: {
    flex: 1,
    margin: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 3,
    alignItems: 'center',
    elevation: 3,
  },
  image: { width: '100%', height: 150, marginBottom: 8, resizeMode: 'cover' },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', paddingHorizontal: 5 },
  productPrice: { fontSize: 14, color: '#888', textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#5a2428' },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#5a2428', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#888' },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 20 },
  close: { position: 'absolute', top: 20, right: 20, padding: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  modalImage: { width: 200, height: 200, resizeMode: 'contain', marginBottom: 20 },
  modalPrice: { fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qtyButton: { width: 40, height: 40, borderRadius: 5, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, elevation: 2 },
  qtyText: { fontSize: 18, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'center' },
  addButton: { width: '80%', padding: 15, backgroundColor: '#5a2428', borderRadius: 5, alignItems: 'center', elevation: 3 },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  navbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },
});

export default Index;
