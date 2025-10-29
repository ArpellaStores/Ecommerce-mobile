// Home.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { addItemToCart } from '../redux/slices/cartSlice';
import { useRouter } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { fetchProductsAndRelated, fetchProducts, fetchProductImage } from '../redux/slices/productsSlice';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const PLACEHOLDER = 'https://via.placeholder.com/150x150/f0f0f0/999999?text=No+Image';

if (!global.__arpella_image_helpers__) {
  global.__arpella_image_helpers__ = {};
  global.__arpella_image_helpers__.pathCache = new Map();

  global.__arpella_image_helpers__.getCachedFilePath = async (uri) => {
    if (!uri) return null;
    if (global.__arpella_image_helpers__.pathCache.has(uri)) {
      return global.__arpella_image_helpers__.pathCache.get(uri);
    }
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, uri);
    const extMatch = uri.match(/\.(png|jpg|jpeg|webp)(\?.*)?$/i);
    const ext = extMatch ? extMatch[1] : 'jpg';
    const dir = `${FileSystem.cacheDirectory}images/`;
    const path = `${dir}${hash}.${ext}`;
    const result = { dir, path };
    global.__arpella_image_helpers__.pathCache.set(uri, result);
    return result;
  };

  global.__arpella_image_helpers__.ensureImageCached = async (uri) => {
    if (!uri) return null;
    try {
      const { dir, path } = await global.__arpella_image_helpers__.getCachedFilePath(uri);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return path;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const res = await FileSystem.downloadAsync(uri, path);
      if (res && (res.status === 200 || typeof res.status === 'undefined')) return path;
      await FileSystem.deleteAsync(path).catch(() => {});
      return null;
    } catch {
      return null;
    }
  };
}

const { getCachedFilePath, ensureImageCached } = global.__arpella_image_helpers__;

const ProductImage = memo(({ product, style, resizeMode = 'cover' }) => {
  const dispatch = useDispatch();
  const fetchAttempted = useRef(false);
  const prefetched = useRef(new Set());
  const noImageTimer = useRef(null);

  const productId = useMemo(
    () => product?.id ?? product?._id ?? product?.productId ?? product?.sku ?? null,
    [product]
  );

  const { storeProduct, isImageLoading } = useSelector(
    (state) => ({
      storeProduct: productId ? state.products?.productsById?.[productId] : undefined,
      isImageLoading: productId ? state.products?.imageLoadingStates?.[productId] || false : false,
    }),
    shallowEqual
  );

  const uri = useMemo(
    () =>
      storeProduct?.imageUrl ??
      product?.imageUrl ??
      product?.image ??
      product?.productimages?.[0]?.imageUrl ??
      null,
    [storeProduct?.imageUrl, product?.imageUrl, product?.image, product?.productimages]
  );

  const [showSpinner, setShowSpinner] = useState(false);
  const [showNoImage, setShowNoImage] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [cachedUri, setCachedUri] = useState(null);

  useEffect(() => {
    if (!productId) return;
    if (storeProduct == null && !isImageLoading && !fetchAttempted.current) {
      fetchAttempted.current = true;
      dispatch(fetchProductImage(productId));
    } else if (storeProduct && !storeProduct.imageUrl && !isImageLoading && !fetchAttempted.current) {
      fetchAttempted.current = true;
      dispatch(fetchProductImage(productId));
    }
  }, [productId, storeProduct, isImageLoading, dispatch]);

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
      setShowNoImage(false);
      if (noImageTimer.current) {
        clearTimeout(noImageTimer.current);
        noImageTimer.current = null;
      }
      return;
    }

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

  useEffect(() => {
    let mounted = true;
    const doCache = async (u) => {
      if (!u) return;
      if (prefetched.current.has(u)) {
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
        } else if (mounted) {
          setCachedUri(null);
        }
      } catch {
        if (mounted) setCachedUri(null);
      }
    };

    doCache(uri);

    return () => {
      mounted = false;
    };
  }, [uri]);

  const onError = useCallback(() => {
    setLoadError(true);
  }, []);

  if (showSpinner) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }, style]}>
        <ActivityIndicator size="small" color="#5a2428" />
      </View>
    );
  }

  const displayUri =
    (cachedUri && (cachedUri.startsWith('file://') ? cachedUri : `file://${cachedUri}`)) || uri;

  if (displayUri && !loadError) {
    return (
      <Image
        source={{ uri: displayUri }}
        style={[{ width: '100%', height: '100%' }, style]}
        resizeMode={resizeMode}
        onError={onError}
      />
    );
  }

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

  return <View style={[{ backgroundColor: '#f8f8f8' }, style]} />;
}, (prev, next) => {
  const prevId = prev.product?.id ?? prev.product?._id ?? prev.product?.productId;
  const nextId = next.product?.id ?? next.product?._id ?? next.product?.productId;
  return prevId === nextId && prev.resizeMode === next.resizeMode;
});

ProductImage.displayName = 'ProductImage';

const Home = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    products: rawProducts,
    categories: rawCategories,
    subcategories: rawSubcategories,
    loading,
    error,
    hasMore,
  } = useSelector((s) => ({
    products: s.products?.products || [],
    categories: s.products?.categories || [],
    subcategories: s.products?.subcategories || [],
    loading: s.products?.loading || false,
    error: s.products?.error || null,
    hasMore: s.products?.hasMore || false,
  }), shallowEqual);

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

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numColumns = isLandscape ? 4 : 2;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtered, setFiltered] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track initial load state
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const initialLoadAttempted = useRef(false);

  const categoriesRef = useRef(null);
  const isFilteringRef = useRef(false);

  const resolveCategoryName = (c) => c?.categoryName ?? c?.name ?? c?.title ?? 'Unknown';
  const resolveSubName = (s) => s?.subcategoryName ?? s?.name ?? s?.title ?? 'Unknown';

  const categories = useMemo(() => {
    const byCat = {};
    if (Array.isArray(rawSubcategories)) {
      rawSubcategories.forEach((sc) => {
        const parentId = sc.categoryId ?? sc.parentCategoryId ?? sc.catId ?? sc.category ?? null;
        const normalizedParent = (parentId === null || typeof parentId === 'undefined') ? null : parentId;
        const id = sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory;
        const name = resolveSubName(sc);
        if (normalizedParent != null && id != null) {
          byCat[String(normalizedParent)] = byCat[String(normalizedParent)] || [];
          byCat[String(normalizedParent)].push({ ...sc, id, subcategoryName: name });
        }
      });
    }

    const cats = Array.isArray(rawCategories) ? rawCategories.map((c) => {
      const id = c.id ?? c._id ?? c.categoryId ?? c.category;
      const name = resolveCategoryName(c);
      let subs = [];
      if (Array.isArray(c.subcategories) && c.subcategories.length > 0) {
        subs = c.subcategories.map(sc => ({ ...sc, id: sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory, subcategoryName: resolveSubName(sc) }));
      } else {
        subs = byCat[String(id)] || [];
      }
      return { ...c, id, name, subcategories: subs };
    }) : [];

    return [{ id: 'All', name: 'All', subcategories: [] }, ...cats];
  }, [rawCategories, rawSubcategories]);

  useEffect(() => {
    if (!initialLoadAttempted.current) {
      initialLoadAttempted.current = true;
      dispatch(fetchProductsAndRelated());
      dispatch(fetchProducts({ pageNumber: 1, pageSize: itemsPerPage }));
      setCurrentPage(1);
    }
  }, [dispatch, itemsPerPage]);

  // Check if initial data has loaded
  useEffect(() => {
    if (!initialLoadComplete && !loading) {
      const hasCategories = Array.isArray(rawCategories) && rawCategories.length > 0;
      const hasProducts = Array.isArray(rawProducts) && rawProducts.length > 0;
      
      // Consider initial load complete if we have categories and products, or if there was an error
      if ((hasCategories && hasProducts) || error) {
        setInitialLoadComplete(true);
      }
    }
  }, [loading, rawCategories, rawProducts, error, initialLoadComplete]);

  const subsOf = useCallback((cat) => {
    if (!cat) return [];
    return (rawSubcategories || []).filter(sc => String(sc.categoryId) === String(cat.id));
  }, [rawSubcategories]);

  useEffect(() => {
    let list = Array.isArray(rawProducts) ? rawProducts.slice() : [];

    if (selectedCategory !== 'All') {
      const selId = selectedCategory?.id ?? selectedCategory;
      list = list.filter(p => String(p.category) === String(selId));
    }

    if (selectedSub) {
      list = list.filter(p => String(p.subcategory) === String(selectedSub.id));
    }

    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.trim().toLowerCase();
      list = list.filter(p => {
        const nm = String(p.name || p.productName || p.inventoryName || '').toLowerCase();
        const cn = String(p.categoryName || '').toLowerCase();
        const sn = String(p.subcategoryName || '').toLowerCase();
        return nm.includes(t) || cn.includes(t) || sn.includes(t);
      });
    }

    setFiltered(list);
  }, [rawProducts, selectedCategory, selectedSub, searchTerm]);

  useEffect(() => {
    if (isFilteringRef.current) return;
    if (!Array.isArray(rawProducts)) return;
    if (filtered.length > 0) return;
    if (!hasMore) return;

    let cancelled = false;
    const run = async () => {
      isFilteringRef.current = true;
      try {
        while (!cancelled && filtered.length === 0 && hasMore) {
          const nextPage = currentPage + 1;
          try {
            await dispatch(fetchProducts({ pageNumber: nextPage, pageSize: itemsPerPage })).unwrap();
            setCurrentPage(prev => Math.max(prev, nextPage));
            await new Promise(res => setTimeout(res, 40));
          } catch {
            break;
          }
        }
      } finally {
        isFilteringRef.current = false;
      }
    };

    run();

    return () => {
      cancelled = true;
      isFilteringRef.current = false;
    };
  }, [selectedCategory, selectedSub, searchTerm, hasMore, filtered.length, rawProducts, currentPage, itemsPerPage, dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loading) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    dispatch(fetchProducts({ pageNumber: nextPage, pageSize: itemsPerPage }))
      .finally(() => {
        setCurrentPage(nextPage);
        setIsLoadingMore(false);
      });
  }, [dispatch, hasMore, currentPage, itemsPerPage, isLoadingMore, loading]);

  const onSelectCategory = useCallback((cat, index) => {
    setSearchTerm('');
    setSelectedSub(null);
    setSelectedCategory(cat || 'All');
    setSelectedProduct(null);

    if (categoriesRef.current && typeof index === 'number') {
      setTimeout(() => {
        try {
          categoriesRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        } catch (e) {
          categoriesRef.current?.scrollToOffset({ offset: index * 90, animated: true });
        }
      }, 100);
    }
  }, []);

  const onSelectSubcategory = useCallback((subcat) => {
    setSearchTerm('');
    setSelectedSub(subcat);
    setSelectedProduct(null);
  }, []);

  const onClearSubcategory = useCallback(() => {
    setSelectedSub(null);
    setSearchTerm('');
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

  const renderProductCard = useCallback(({ item }) => {
    const horizontalPadding = 30;
    const totalAvailable = Math.max(0, width - horizontalPadding);
    const perCardGutter = 16;
    const cardWidth = Math.floor((totalAvailable - (numColumns * perCardGutter)) / numColumns);
    const imageContainerHeight = isLandscape ? 140 : 200;

    return (
      <TouchableOpacity style={[styles.card, { width: cardWidth, margin: 8 }]} onPress={() => onSelectProduct(item)} activeOpacity={0.7}>
        <View style={{ width: '100%', height: imageContainerHeight, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' }}>
          <ProductImage product={item} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <Text style={styles.productName} numberOfLines={2}>{item.name || item.productName || 'Unnamed Product'}</Text>
        <View style={styles.priceWrapper}>
          <Text style={styles.productPrice}>KSH {item.price != null ? Number(item.price).toLocaleString() : '0'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [onSelectProduct, width, numColumns, isLandscape]);

  const renderCategoryItem = useCallback(({ item, index }) => {
    const isActive = String(selectedCategory?.id ?? selectedCategory) === String(item.id);
    const hasSubs = Array.isArray(item.subcategories) && item.subcategories.length > 0;
    return (
      <TouchableOpacity onPress={() => onSelectCategory(item, index)} style={[styles.filterButton, isActive && styles.filterButtonActive]} activeOpacity={0.7}>
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.name}</Text>
        {hasSubs && <Text style={{ marginLeft: 4, color: isActive ? '#fff' : '#666', fontSize: 10 }}>▼</Text>}
      </TouchableOpacity>
    );
  }, [selectedCategory, onSelectCategory]);

  const keyExtractor = useCallback((item, index) => {
    const id = item?.id ?? item?._id ?? item?.productId;
    return id ? String(id) : `product-${index}`;
  }, []);

  const getItemLayout = useCallback((data, index) => {
    const horizontalPadding = 30;
    const totalAvailable = Math.max(0, width - horizontalPadding);
    const perCardGutter = 16;
    const cardWidth = Math.floor((totalAvailable - (numColumns * perCardGutter)) / numColumns);
    const imageHeight = isLandscape ? 140 : 200;
    const ITEM_HEIGHT = imageHeight + 120;
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * Math.floor(index / numColumns), index };
  }, [width, numColumns, isLandscape]);

  const ListFooterComponent = useCallback(() => {
    if (isLoadingMore || loading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.footerText}>Loading more products...</Text>
        </View>
      );
    }
    if (!hasMore && Array.isArray(rawProducts) && rawProducts.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            {filtered.length > 0 ? `Showing ${filtered.length} of ${rawProducts.length} products` : `Loaded all ${rawProducts.length} products`}
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, loading, hasMore, rawProducts, filtered.length]);

  // Show initial loading overlay
  if (!initialLoadComplete) {
    return (
      <View style={styles.overlayContainer}>
        <View style={styles.overlayContent}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.overlayText}>Loading Arpella Stores...</Text>
          <Text style={styles.overlaySubtext}>Preparing products and categories</Text>
        </View>
      </View>
    );
  }

  if (error && (!Array.isArray(rawProducts) || rawProducts.length === 0)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setInitialLoadComplete(false);
          initialLoadAttempted.current = false;
          dispatch(fetchProductsAndRelated());
        }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Arpella Stores</Text>
        <TouchableOpacity onPress={() => router.push('./cart')} accessibilityRole="button" accessibilityLabel="Open cart">
          <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesome name="shopping-cart" size={24} />
            {cartCount > 0 && (
              <View style={styles.cartBadge} pointerEvents="none">
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.searchInput} placeholder="Search products…" value={searchTerm} onChangeText={setSearchTerm} returnKeyType="search" />

      <View style={styles.categoriesWrapper}>
        <FlatList
          ref={categoriesRef}
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.filterContainer}
          renderItem={renderCategoryItem}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>

      {selectedCategory !== 'All' && subsOf(selectedCategory).length > 0 && (
        <View style={styles.categoriesWrapper}>
          <View style={styles.subcategoryContainer}>
            <FlatList
              data={subsOf(selectedCategory)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id ?? item._id ?? item.subcategoryId)}
              contentContainerStyle={styles.subcategoryContent}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => onSelectSubcategory(item)} style={[styles.subcategoryButton, String(selectedSub?.id) === String(item.id) && styles.subcategoryButtonActive]} activeOpacity={0.7}>
                  <Text style={[styles.subcategoryText, String(selectedSub?.id) === String(item.id) && styles.subcategoryTextActive]}>
                    {item.subcategoryName ?? item.name ?? 'Unknown'}
                  </Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={selectedSub ? (
                <TouchableOpacity onPress={onClearSubcategory} style={[styles.subcategoryButton, { backgroundColor: '#ff6b6b' }]} activeOpacity={0.7}>
                  <FontAwesome name="times" size={12} color="#fff" />
                  <Text style={[styles.subcategoryText, { color: '#fff', marginLeft: 4 }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              initialNumToRender={8}
              maxToRenderPerBatch={4}
            />
          </View>
        </View>
      )}

      {(selectedCategory !== 'All' || selectedSub) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            Filters: {selectedCategory?.name ?? (selectedCategory === 'All' ? 'All' : '')}
            {selectedSub ? ` > ${selectedSub.subcategoryName ?? selectedSub.name}` : ''}
            {' '}({filtered.length} products)
          </Text>
        </View>
      )}

      <View style={styles.products}>
        {filtered.length === 0 && !loading ? (
          <View style={styles.centered}>
            <FontAwesome name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
            {(selectedCategory !== 'All' || selectedSub) && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={() => { setSelectedCategory('All'); setSelectedSub(null); setSearchTerm(''); }}>
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            numColumns={numColumns}
            keyExtractor={keyExtractor}
            renderItem={renderProductCard}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={ListFooterComponent}
            key={`cols-${numColumns}`}
            contentContainerStyle={{ paddingBottom: 120 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            getItemLayout={getItemLayout}
          />
        )}
      </View>

      {selectedProduct && (
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)} transparent={false}>
          <View style={styles.modal}>
            <View style={styles.closeButtonContainer}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close product modal">
                <FontAwesome name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>{selectedProduct.name || selectedProduct.productName || 'Product'}</Text>

            <View style={styles.modalImageContainer}>
              <ProductImage product={selectedProduct} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>

            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalPrice}>KSH {selectedProduct.price != null ? Number(selectedProduct.price).toLocaleString() : '0'}</Text>
            </View>

            <View style={styles.quantityRow}>
              <TouchableOpacity onPress={() => setSelectedProduct((p) => ({ ...p, quantity: Math.max(1, (p.quantity || 1) - 1) }))} style={styles.qtyButton}>
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{selectedProduct.quantity}</Text>
              <TouchableOpacity onPress={() => setSelectedProduct((p) => ({ ...p, quantity: (p.quantity || 1) + 1 }))} style={styles.qtyButton}>
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

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
  container: { 
    flex: 1, 
    backgroundColor: '#FFF8E1', 
    paddingHorizontal: 15, 
    paddingTop: 30 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 13 
  },
  title: { 
    fontSize: 25, 
    fontWeight: 'bold' 
  },
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
  filterContainer: { 
    alignItems: 'center', 
    paddingHorizontal: 5 
  },
  filterButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    elevation: 2,
    minWidth: 70,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterButtonActive: { 
    backgroundColor: '#5a2428' 
  },
  filterText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  filterTextActive: { 
    color: '#fff' 
  },
  subcategoryContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginHorizontal: 5,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subcategoryContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8
  },
  subcategoryButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryButtonActive: {
    backgroundColor: '#5a2428',
    borderColor: '#5a2428',
  },
  subcategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  subcategoryTextActive: {
    color: '#fff',
  },
  activeFiltersContainer: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
  },
  products: { 
    flex: 1, 
    marginBottom: 10 
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
  productName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 6, 
    textAlign: 'center', 
    paddingHorizontal: 5 
  },
  priceWrapper: { 
    marginBottom: 8 
  },
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
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#5a2428' 
  },
  errorText: { 
    fontSize: 16, 
    color: '#d32f2f', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  retryButton: { 
    backgroundColor: '#5a2428', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 5 
  },
  retryText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#888',
    marginTop: 12,
  },
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: '#5a2428',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#5a2428',
    fontWeight: '600',
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerEndText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  modal: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFF8E1', 
    padding: 20 
  },
  closeButtonContainer: {
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
  },
  closeButton: {
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
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  modalImageContainer: { 
    marginBottom: 20, 
    width: 120, 
    height: 260 
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1976d2',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quantityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  qtyButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 5, 
    backgroundColor: '#ddd', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginHorizontal: 10, 
    elevation: 2 
  },
  qtyText: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  qtyValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    width: 30, 
    textAlign: 'center' 
  },
  addButton: { 
    width: '80%', 
    padding: 15, 
    backgroundColor: '#5a2428', 
    borderRadius: 5, 
    alignItems: 'center', 
    elevation: 3 
  },
  addButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  navbar: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    height: 50, 
    borderTopWidth: 1, 
    borderTopColor: '#ccc', 
    backgroundColor: '#FFF8E1' 
  },
  navItem: { 
    alignItems: 'center' 
  },
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
  overlayContainer: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 280,
  },
  overlayText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5a2428',
    textAlign: 'center',
  },
  overlaySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default Home;