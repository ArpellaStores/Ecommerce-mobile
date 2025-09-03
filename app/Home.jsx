// src/screens/Index.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToCart } from '../redux/slices/cartSlice';
import { useRouter } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { fetchProductsAndRelated, fetchProducts, fetchProductImage } from '../redux/slices/productsSlice';

import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * Index screen with Expo-based image caching and improved price styling.
 *
 * Requirements:
 *  expo install expo-file-system expo-crypto
 *
 * Behavior:
 * - Server-side pagination (infinite scroll) via fetchProducts
 * - fetchProductImage dispatch (same as web)
 * - Cache images to FileSystem.cacheDirectory/images/<md5>.ext
 * - Avoid flicker: spinner while loading, delay "No image" fallback
 * - Improved price pill styling
 */

// placeholder used when no image is available
const PLACEHOLDER = 'https://via.placeholder.com/150x150/f0f0f0/999999?text=No+Image';

// Helper: create cache file path for a given image URI
const getCachedFilePath = async (uri) => {
  if (!uri) return null;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, uri);
  // preserve extension if present (fallback to .jpg)
  const extMatch = uri.match(/\.(png|jpg|jpeg|webp)(\?.*)?$/i);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const dir = `${FileSystem.cacheDirectory}images/`;
  const path = `${dir}${hash}.${ext}`;
  return { dir, path };
};

// Prefetch & cache image to filesystem, return local file uri on success
const ensureImageCached = async (uri) => {
  if (!uri) return null;
  try {
    const { dir, path } = await getCachedFilePath(uri);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      return path;
    }
    // ensure directory exists
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    // download
    const res = await FileSystem.downloadAsync(uri, path);
    if (res && (res.status === 200 || res.status === undefined)) {
      // Note: on some platforms downloadAsync returns an object without `status`, treat as success.
      return path;
    }
    // fallback: remove file if bad
    await FileSystem.deleteAsync(path).catch(() => {});
    return null;
  } catch (e) {
    // ignore caching errors, caller can fallback to original uri
    return null;
  }
};

/**
 * ProductImage component
 * - Reads imageUrl from normalized store (productsById) if available
 * - Dispatches fetchProductImage once if needed (guarded)
 * - Caches downloaded images via expo-file-system
 * - Shows spinner while loading and delays "No image" fallback to avoid flicker
 *
 * Fixes applied:
 * - useSelector only selects by stable productId (no returning prop object)
 * - guarded dispatch to avoid loops
 */
const ProductImage = ({ product, style, resizeMode = 'cover' }) => {
  const dispatch = useDispatch();
  const fetchAttempted = useRef(false);
  const prefetched = useRef(new Set());
  const noImageTimer = useRef(null);

  // compute stable productId once
  const productId = product?.id ?? product?._id ?? product?.productId ?? product?.sku ?? null;

  // select product from normalized store by id (do NOT return prop object)
  const storeProduct = useSelector((state) => (productId ? state.products?.productsById?.[productId] : undefined));

  // select image loading state by productId
  const isImageLoading = useSelector((state) => (productId ? state.products?.imageLoadingStates?.[productId] || false : false));

  // resolved uri either from storeProduct or from direct prop (but NOT used as selector input)
  const uri = storeProduct?.imageUrl ?? product?.imageUrl ?? product?.image ?? null;

  // local UI state for caching/rendering
  const [showSpinner, setShowSpinner] = useState(false);
  const [showNoImage, setShowNoImage] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [cachedUri, setCachedUri] = useState(null);

  // Dispatch image fetch only if we have a productId and image is not present and not already loading
  useEffect(() => {
    if (!productId) return;
    if (storeProduct == null && !isImageLoading && !fetchAttempted.current) {
      // attempt fetch once
      fetchAttempted.current = true;
      dispatch(fetchProductImage(productId));
    } else if (storeProduct && !storeProduct.imageUrl && !isImageLoading && !fetchAttempted.current) {
      // storeProduct exists but imageUrl missing -> fetch once
      fetchAttempted.current = true;
      dispatch(fetchProductImage(productId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeProduct?.imageUrl, isImageLoading, dispatch]);

  // manage spinner/no-image timing to prevent flicker
  useEffect(() => {
    if (isImageLoading) {
      setShowSpinner(true);
      setShowNoImage(false);
      if (noImageTimer.current) {
        clearTimeout(noImageTimer.current);
        noImageTimer.current = null;
      }
      return;
    }

    setShowSpinner(false);

    if (uri) {
      // image available — cancel no-image timer and show image
      setShowNoImage(false);
      if (noImageTimer.current) {
        clearTimeout(noImageTimer.current);
        noImageTimer.current = null;
      }
      return;
    }

    // delay showing "No image" fallback to avoid rapid toggles
    if (!noImageTimer.current) {
      noImageTimer.current = setTimeout(() => {
        setShowNoImage(true);
        noImageTimer.current = null;
      }, 700);
    }

    return () => {
      if (noImageTimer.current) {
        clearTimeout(noImageTimer.current);
        noImageTimer.current = null;
      }
    };
  }, [isImageLoading, uri]);

  // When uri becomes available, cache it with expo-file-system
  useEffect(() => {
    let mounted = true;
    const doCache = async (u) => {
      if (!u) return;
      if (prefetched.current.has(u)) {
        // compute cached path quickly (if exists)
        const { path } = await getCachedFilePath(u);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          if (mounted) setCachedUri(path);
          return;
        }
      }

      try {
        const local = await ensureImageCached(u);
        if (mounted && local) {
          prefetched.current.add(u);
          setCachedUri(local);
        } else {
          // no cached file — still attempt to use remote uri
          if (mounted) setCachedUri(null);
        }
      } catch (e) {
        if (mounted) setCachedUri(null);
      }
    };

    doCache(uri);

    return () => {
      mounted = false;
    };
  }, [uri]);

  const onError = () => {
    setLoadError(true);
  };

  const onLoadEnd = () => {
    // image loaded — nothing to do
  };

  // render priority:
  // 1) show spinner if fetching
  if (showSpinner) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }, style]}>
        <ActivityIndicator size="small" color="#5a2428" />
        <Text style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Loading...</Text>
      </View>
    );
  }

  // 2) render cached local file if available, else remote uri if present and not errored
  const displayUri = (cachedUri && (cachedUri.startsWith('file://') ? cachedUri : `file://${cachedUri}`)) || uri;
  if (displayUri && !loadError) {
    return (
      <Image
        source={{ uri: displayUri }}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        resizeMode={resizeMode}
        onError={onError}
        onLoadEnd={onLoadEnd}
      />
    );
  }

  // 3) if errored or showNoImage after delay, render placeholder + "No image"
  if (loadError || showNoImage) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }, style]}>
        <Image
          source={{ uri: PLACEHOLDER }}
          style={{ width: style?.width || 100, height: style?.height || 100, resizeMode: 'cover' }}
        />
        <Text style={{ color: '#888', fontSize: 12, marginTop: 6 }}>No image</Text>
      </View>
    );
  }

  // 4) default empty (rare)
  return <View style={[{ backgroundColor: '#f8f8f8' }, style]} />;
};

const Home = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const {
    products = [],
    categories: rawCategories = [],
    subcategories: rawSubcategories = [],
    loading,
    error,
    hasMore,
    pageFetchStatus = {},
  } = useSelector((s) => s.products || {});

  // --- cart badge: compute total quantity robustly (handles array or keyed object)
  const cartCount = useSelector((s) => {
    const cart = s.cart || {};
    const itemsCandidate = cart.items ?? cart.cartItems ?? [];
    if (Array.isArray(itemsCandidate)) {
      return itemsCandidate.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
    }
    if (itemsCandidate && typeof itemsCandidate === 'object') {
      return Object.values(itemsCandidate).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
    }
    return 0;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentCategory, setCurrentCategory] = useState({ id: 'All', name: 'All', subcategories: [] });
  const [currentSubcategory, setCurrentSubcategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // matches slice default
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // categories FlatList ref for scrollToIndex
  const categoriesRef = useRef(null);

  // --- respond to orientation: portrait -> 2 columns, landscape -> 4 columns
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numColumns = isLandscape ? 4 : 2;

  // -------------------------------
  // Helpers: resolve ids / image urls
  // -------------------------------
  const getId = useCallback((val) => {
    if (val == null) return '';
    if (typeof val === 'object') return String(val.id ?? val._id ?? val.categoryId ?? '');
    return String(val);
  }, []);

  // -------------------------------
  // Build categories with subcategories (derive in component)
  // -------------------------------
  const categories = useMemo(() => {
    const cats = Array.isArray(rawCategories) ? rawCategories.map((c) => ({
      id: c.id ?? c._id ?? c.categoryId ?? String(c.id ?? c._id ?? c.categoryId ?? ''),
      name: c.categoryName ?? c.name ?? c.title ?? 'Unknown',
      raw: c,
    })) : [];

    const byCat = {};
    if (Array.isArray(rawSubcategories)) {
      rawSubcategories.forEach((sc) => {
        const parentId = sc.categoryId ?? sc.parentCategoryId ?? sc.catId ?? sc.category?._id ?? sc.category?.id ?? sc.category ?? sc.parentId;
        const pid = parentId != null ? String(parentId) : null;
        if (pid) {
          byCat[pid] = byCat[pid] || [];
          byCat[pid].push({
            ...sc,
            id: sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subId,
            name: sc.subcategoryName ?? sc.name ?? sc.subCategoryName ?? sc.title ?? sc.subname ?? 'Unknown Subcategory'
          });
        }
      });
    }

    const formatted = cats.map((c) => ({
      id: c.id || String(c.name),
      name: c.name,
      subcategories: byCat[c.id] || (Array.isArray(c.raw?.subcategories) ? c.raw.subcategories.map(sub => ({
        ...sub,
        name: sub.subcategoryName ?? sub.name ?? sub.subCategoryName ?? sub.title ?? 'Unknown Subcategory'
      })) : []),
    }));

    return [{ id: 'All', name: 'All', subcategories: [] }, ...formatted];
  }, [rawCategories, rawSubcategories]);

  // -------------------------------
  // Initial fetch on mount
  // -------------------------------
  useEffect(() => {
    dispatch(fetchProductsAndRelated());
    dispatch(fetchProducts({ pageNumber: 1, pageSize: itemsPerPage }));
    setCurrentPage(1);
  }, [dispatch, itemsPerPage]);

  // -------------------------------
  // Filtering client-side (same as before)
  // -------------------------------
  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? [...products] : [];
    let out = list;
    if (currentCategory?.id && currentCategory.id !== 'All') {
      out = out.filter((p) => getId(p.category) === String(currentCategory.id));
    }
    if (currentSubcategory) {
      out = out.filter((p) => getId(p.subcategory) === String(currentSubcategory.id));
    }
    const term = (searchTerm || '').trim().toLowerCase();
    if (term) {
      out = out.filter((p) => (String(p.name || p.productName || '').toLowerCase().includes(term)));
    }
    return out;
  }, [products, currentCategory, currentSubcategory, searchTerm, getId]);

  // -------------------------------
  // Infinite scroll handler (server-side pages)
  // -------------------------------
  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    const nextPage = (currentPage || 1) + 1;
    if (pageFetchStatus[nextPage] === 'pending') return;
    setIsLoadingMore(true);
    dispatch(fetchProducts({ pageNumber: nextPage, pageSize: itemsPerPage }))
      .finally(() => {
        setCurrentPage(nextPage);
        setTimeout(() => setIsLoadingMore(false), 300);
      });
  }, [dispatch, hasMore, currentPage, pageFetchStatus, itemsPerPage]);

  // -------------------------------
  // Handlers: category / product / cart
  // -------------------------------
  const onSelectCategory = useCallback((cat, index) => {
    setSearchTerm('');
    setCurrentSubcategory(null);
    setCurrentCategory(cat);
    setSelectedProduct(null);
    if (categoriesRef.current && typeof index === 'number') {
      try {
        categoriesRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      } catch (e) { }
    }
  }, []);

  const onSelectProduct = useCallback((product) => {
    setSelectedProduct({ ...product, quantity: 1 });
    setModalVisible(true);
  }, []);

  const onAddToCart = useCallback(() => {
    if (!selectedProduct) return;
    const resolvedId =
      selectedProduct.id ??
      selectedProduct._id ??
      selectedProduct.productId ??
      selectedProduct.sku ??
      `${(selectedProduct.name || 'product').replace(/\s+/g, '-')}-${Date.now()}`;
    dispatch(addItemToCart({ product: { id: resolvedId, quantity: selectedProduct.quantity } }));
    setModalVisible(false);
    setSelectedProduct(null);
  }, [dispatch, selectedProduct]);

  // -------------------------------
  // Render product card (uses ProductImage)
  // image container height increased to give more downward length
  // -------------------------------
  const renderProductCard = useCallback(({ item, index }) => {
    // compute card width & image height dynamically so layout is consistent across columns
    const horizontalPadding = 15 * 2; // container paddingHorizontal * 2
    const totalAvailable = Math.max(0, width - horizontalPadding);
    const perCardGutter = 16; // estimate: marginLeft + marginRight (8 + 8)
    const cardWidth = Math.floor((totalAvailable - (numColumns * perCardGutter)) / numColumns);
    const imageContainerHeight = isLandscape ? 140 : 200;

    return (
      <TouchableOpacity
        style={[styles.card, { width: cardWidth, margin: 8 }]}
        onPress={() => onSelectProduct(item)}
      >
        <View style={{ width: '100%', height: imageContainerHeight, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' }}>
          {/* pass explicit style to ProductImage so fallback sizing works */}
          <ProductImage product={item} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <Text style={styles.productName}>{item.name || item.productName || 'Unnamed Product'}</Text>
        <View style={styles.priceWrapper}>
          <Text style={styles.productPrice}>KSH {item.price != null ? Number(item.price).toLocaleString() : '0'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [onSelectProduct, width, numColumns, isLandscape]);

  // -------------------------------
  // Category renderer
  // -------------------------------
  const renderCategoryItem = useCallback(({ item, index }) => {
    const isActive = currentCategory.id === item.id;
    const hasSubs = Array.isArray(item.subcategories) && item.subcategories.length > 0;
    return (
      <TouchableOpacity
        onPress={() => onSelectCategory(item, index)}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.name}</Text>
        {hasSubs && (
          <Text style={{ marginLeft: 4, color: isActive ? '#fff' : '#666', fontSize: 10 }}>
            ▼
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [currentCategory, onSelectCategory]);

  const keyExtractor = useCallback((item, index) => String(item?.id ?? item?._id ?? item?.productId ?? `${(item?.name ?? 'p').replace(/\s+/g, '-')}-${index}`), []);

  // Footer component to show spinner while fetching next page
  const ListFooterComponent = () => {
    const nextPage = (currentPage || 1) + 1;
    const pending = pageFetchStatus[nextPage] === 'pending' || isLoadingMore;
    if (pending) {
      return (
        <View style={{ padding: 12 }}>
          <ActivityIndicator size="small" color="#5a2428" />
        </View>
      );
    }
    if (!hasMore && filteredProducts.length > 0) {
      return (
        <View style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 14 }}>
            Showing {filteredProducts.length} products
          </Text>
        </View>
      );
    }
    return null;
  };

  // -------------------------------
  // Render states
  // -------------------------------
  if (loading && (!Array.isArray(products) || products.length === 0)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5a2428" />
        <Text style={styles.loadingText}>Loading products…</Text>
      </View>
    );
  }
  if (error && (!Array.isArray(products) || products.length === 0)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => dispatch(fetchProductsAndRelated())}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------
  // Component JSX
  // -------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Arpella Stores</Text>
        <TouchableOpacity onPress={() => router.push('./cart')} accessibilityRole="button" accessibilityLabel="Open cart">
          <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesome name="shopping-cart" size={24} />
            {cartCount > 0 && (
              <View style={styles.cartBadge} pointerEvents="none" accessibilityLabel={`Cart items: ${cartCount}`}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </View>
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
          ref={categoriesRef}
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id ?? item._id ?? item.name)}
          contentContainerStyle={styles.filterContainer}
          renderItem={renderCategoryItem}
        />
      </View>

      {/* Subcategory Tabs */}
      {currentCategory.id !== 'All' && currentCategory.subcategories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <View style={{
            backgroundColor: '#f8f8f8',
            borderRadius: 8,
            marginHorizontal: 5,
            paddingVertical: 8,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}>
            <FlatList
              data={currentCategory.subcategories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id ?? item._id ?? item.name)}
              contentContainerStyle={{
                alignItems: 'center',
                paddingHorizontal: 10,
                gap: 8
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setCurrentSubcategory(item)}
                  style={[
                    {
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: currentSubcategory?.id === item.id ? '#5a2428' : '#fff',
                      borderWidth: 1,
                      borderColor: currentSubcategory?.id === item.id ? '#5a2428' : '#ddd',
                      marginHorizontal: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 1,
                      elevation: 2,
                    }
                  ]}
                >
                  <Text style={[
                    {
                      fontSize: 11,
                      fontWeight: '600',
                      color: currentSubcategory?.id === item.id ? '#fff' : '#333',
                      textAlign: 'center'
                    }
                  ]}>
                    {item.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
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
            numColumns={numColumns} // dynamic: 2 => portrait, 4 => landscape
            extraData={[currentCategory?.id, currentSubcategory?.id, searchTerm, currentPage, hasMore, numColumns]}
            keyExtractor={keyExtractor}
            renderItem={renderProductCard}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.6}
            ListFooterComponent={ListFooterComponent}
            // force rerender when columns change
            key={`cols-${numColumns}`}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>

      {/* Product Modal */}
      {selectedProduct && (
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modal}>
            {/* Close button */}
            <View style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
                accessibilityRole="button"
                accessibilityLabel="Close product modal"
              >
                <FontAwesome name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>{selectedProduct.name || selectedProduct.productName || 'Product'}</Text>

            {/* Modal image (uses ProductImage) */}
            <View style={{ marginBottom: 20, width: 120, height: 260 }}>
              <ProductImage product={selectedProduct} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>

            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalPrice}>KSH {selectedProduct.price != null ? Number(selectedProduct.price).toLocaleString() : '0'}</Text>
            </View>

            <View style={styles.quantityRow}>
              <TouchableOpacity
                onPress={() => setSelectedProduct((p) => ({ ...p, quantity: Math.max(1, (p.quantity || 1) - 1) }))}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{selectedProduct.quantity}</Text>
              <TouchableOpacity
                onPress={() => setSelectedProduct((p) => ({ ...p, quantity: (p.quantity || 1) + 1 }))}
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

// --- styles preserved except price changes + image height tweak + cart badge ---
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
    // removed flex:1 and rely on computed width to ensure correct columns
    // margin is applied inline where we compute card width
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 3,
    alignItems: 'center',
    elevation: 3,
  },
  image: { width: '100%', height: 100, marginBottom: 20, resizeMode: 'fit' }, // kept
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', paddingHorizontal: 5 },
  // improved price styling
  priceWrapper: { marginBottom: 8 },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1976d2',
    textAlign: 'center',
    backgroundColor: '#e8f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden'
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#5a2428' },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#5a2428', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#888' },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 20 },
  close: { position: 'absolute', top: 20, right: 20, padding: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  modalImage: { width: 150, height: 260, resizeMode: 'contain', marginBottom: 20 }, // increased modal image height
  modalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1976d2',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qtyButton: { width: 40, height: 40, borderRadius: 5, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, elevation: 2 },
  qtyText: { fontSize: 18, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'center' },
  addButton: { width: '80%', padding: 15, backgroundColor: '#5a2428', borderRadius: 5, alignItems: 'center', elevation: 3 },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  navbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },

  // cart badge styles (new)
  cartBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    elevation: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default Home;
