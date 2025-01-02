import React, { useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Modal, StyleSheet, TextInput, Button } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToCart } from '../redux/slices/cartSlice';
import { v4 as uuidv4 } from 'uuid';
import { products } from '../demoData/products';
import { useRouter } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const Index = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('All');
  const cart = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const router = useRouter();

  const categories = [
    { name: 'All' },
    ...Array.from(
      new Set(products.map((product) => product.Category))
    ).map((category) => ({ name: category }))
  ];

  const handleProductClick = (product) => {
    const cartItem = cart[product.Name];
    setSelectedProduct({
      ...product,
      quantity: cartItem ? cartItem.quantity : 1,
    });
    setShowModal(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const productWithId = { ...selectedProduct, id: selectedProduct.Name || uuidv4() };
    dispatch(addItemToCart({ product: productWithId }));
    setShowModal(false);
  };

  const filterProductsByCategory = (category) => {
    setCurrentCategory(category);
    setFilteredProducts(
      category === 'All' ? products : products.filter((product) => product.Category === category)
    );
  };

  const displayedProducts = filteredProducts.length > 0 ? filteredProducts : products;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arpella Stores</Text>
        <FontAwesome name="shopping-cart" size={24} color="black" onPress={() => router.push('./cart')} />
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => filterProductsByCategory(item.name)}
            style={styles.categoryButton}
          >
            <Text style={styles.categoryButtonText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.categoryTitle}>{currentCategory} Products</Text>
      <FlatList
        data={displayedProducts}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleProductClick(item)} style={styles.cardContainer}>
            <View style={styles.card}>
              <Image source={{ uri: item.Image }} style={styles.image} />
              <Text style={styles.productName}>{item.Name}</Text>
              <Text style={styles.productPrice}>${item.Price}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.Name}
      />
      {selectedProduct && (
        <Modal visible={showModal} onRequestClose={() => setShowModal(false)} animationType="slide">
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedProduct.Name}</Text>
            <Image source={{ uri: selectedProduct.Image }} style={styles.modalImage} />
            <Text style={styles.modalPrice}>Price: ${selectedProduct.Price}</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct((prev) =>
                    prev ? { ...prev, quantity: Math.max(1, (prev.quantity ?? 1) - 1) } : prev
                  )
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
              <TouchableOpacity
                onPress={() =>
                  setSelectedProduct((prev) =>
                    prev ? { ...prev, quantity: (prev.quantity ?? 0) + 1 } : prev
                  )
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddToCart}>
              <Text style={styles.actionButtonText}>Add to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowModal(false)}>
              <Text style={styles.actionButtonText}>Close</Text>
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
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./orders')}>
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
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
  },
  actionButton: {
    width: '80%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#5a2428',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0056b3',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 15,
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
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  categoryButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
    height:40

  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    marginTop:10
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
  },
  image: {
    width: '100%',
    height: 150,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
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
});

export default Index;
