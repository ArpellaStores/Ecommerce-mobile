import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react'
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
  ScrollView,
  Platform,
  Alert,
} from 'react-native'
import { useDispatch, useSelector, shallowEqual } from 'react-redux'
import { addItemToCart } from '../redux/slices/cartSlice'
import { useRouter } from 'expo-router'
import FontAwesome from 'react-native-vector-icons/FontAwesome'
import {
  useGetPagedProductsQuery,
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
  useGetInventoriesQuery,
  useGetProductImageQuery,
} from '../redux/api/productsApi'
import {
  setProducts,
  appendProducts,
  setCategories,
  setSubcategories,
  setProductImageData,
} from '../redux/slices/productsSlice'
import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'
import BottomNav from '../components/BottomNav'
import ProductImage from '../components/ProductImage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'



const NAV_HEIGHT = 64
const H_GUTTER = 15
const EMPTY_ARR = Object.freeze([])

const Home = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  const {
    data: pageData,
    isLoading: pageLoading,
    isFetching: pageFetching,
    error: pageError,
    refetch: refetchProducts,
  } = useGetPagedProductsQuery({ pageNumber: currentPage, pageSize: itemsPerPage })

  const {
    data: catData,
    isLoading: catLoading,
    error: catError,
    refetch: refetchCats,
  } = useGetCategoriesQuery()

  const {
    data: subcatData,
    isLoading: subcatLoading,
    error: subcatError,
    refetch: refetchSubs,
  } = useGetSubcategoriesQuery()

  const {
    data: inventoriesData,
    isLoading: invLoading,
    error: invError,
    refetch: refetchInvs,
  } = useGetInventoriesQuery()

  const inventoryMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(inventoriesData)) {
      inventoriesData.forEach((inv) => {
        if (inv?.productId) {
          map.set(String(inv.productId).toLowerCase(), Number(inv.stockQuantity ?? 0))
        }
      })
    }
    return map
  }, [inventoriesData])

  const productsSlice = useSelector(
    (s) => ({
      products: s.products?.products ?? EMPTY_ARR,
      categories: s.products?.categories ?? EMPTY_ARR,
      subcategories: s.products?.subcategories ?? EMPTY_ARR,
      loading: Boolean(s.products?.loading),
      error: s.products?.error ?? null,
      hasMore: Boolean(s.products?.hasMore),
    }),
    shallowEqual
  )

  const rawProducts = productsSlice.products
  const rawCategories = productsSlice.categories
  const rawSubcategories = productsSlice.subcategories
  const loading = pageLoading || catLoading || subcatLoading || invLoading || productsSlice.loading
  const error = pageError || catError || subcatError || invError || productsSlice.error
  const hasMore = productsSlice.hasMore

  const cartState = useSelector((s) => s.cart)

  const cartCount = useMemo(() => {
    const items = cartState?.items ?? cartState?.cartItems ?? {}
    if (Array.isArray(items)) {
      return items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
    }
    return Object.values(items).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
  }, [cartState])

  useEffect(() => {
    console.log('[CART DEBUG] cartState changed:', {
      keys: cartState ? Object.keys(cartState) : [],
      itemsType: Array.isArray(cartState?.items) ? 'array' : typeof cartState?.items,
      items: cartState?.items,
      cartItems: cartState?.cartItems,
      raw: cartState,
    })
  }, [cartState])

  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const numColumns = isLandscape ? 4 : 2

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSub, setSelectedSub] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const currentPageRef = useRef(1)

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const initialLoadAttempted = useRef(false)
  const categoriesRef = useRef(null)
  const isFilteringRef = useRef(false)

  useEffect(() => {
    if (pageData && pageData.items && !pageFetching) {
      if (currentPageRef.current === 1) {
        dispatch(setProducts(pageData.items))
      } else {
        dispatch(
          appendProducts({
            items: pageData.items,
            pageNumber: currentPageRef.current,
            hasMore: pageData.hasMore,
          })
        )
      }
    }
  }, [pageData, pageFetching, dispatch])

  useEffect(() => {
    if (catData) dispatch(setCategories(catData))
  }, [catData, dispatch])

  useEffect(() => {
    if (subcatData) dispatch(setSubcategories(subcatData))
  }, [subcatData, dispatch])

  const resolveCategoryName = (c) => c?.categoryName ?? c?.name ?? c?.title ?? 'Unknown'
  const resolveSubName = (s) => s?.subcategoryName ?? s?.name ?? s?.title ?? 'Unknown'

  const categories = useMemo(() => {
    const byCat = {}

    if (Array.isArray(rawSubcategories)) {
      rawSubcategories.forEach((sc) => {
        const parentId = sc.categoryId ?? sc.parentCategoryId ?? sc.catId ?? sc.category ?? null
        const normalizedParent =
          parentId === null || typeof parentId === 'undefined' ? null : parentId
        const id = sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory
        const name = resolveSubName(sc)

        if (normalizedParent != null && id != null) {
          byCat[String(normalizedParent)] = byCat[String(normalizedParent)] || []
          byCat[String(normalizedParent)].push({ ...sc, id, subcategoryName: name })
        }
      })
    }

    const cats = Array.isArray(rawCategories)
      ? rawCategories.map((c) => {
          const id = c.id ?? c._id ?? c.categoryId ?? c.category
          const name = resolveCategoryName(c)
          let subs = []

          if (Array.isArray(c.subcategories) && c.subcategories.length > 0) {
            subs = c.subcategories.map((sc) => ({
              ...sc,
              id: sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory,
              subcategoryName: resolveSubName(sc),
            }))
          } else {
            subs = byCat[String(id)] || []
          }

          return { ...c, id, name, subcategories: subs }
        })
      : []

    return [{ id: 'All', name: 'All', subcategories: [] }, ...cats]
  }, [rawCategories, rawSubcategories])

  useEffect(() => {
    if (!initialLoadComplete && !loading) setInitialLoadComplete(true)
  }, [loading, initialLoadComplete])

  const subsOf = useCallback(
    (cat) => {
      if (!cat) return EMPTY_ARR
      return (rawSubcategories || EMPTY_ARR).filter((sc) => String(sc.categoryId) === String(cat.id))
    },
    [rawSubcategories]
  )

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(rawProducts) ? rawProducts : []

    if (selectedCategory !== 'All') {
      const selId = selectedCategory?.id ?? selectedCategory
      list = list.filter((p) => String(p.category) === String(selId))
    }

    if (selectedSub) {
      list = list.filter((p) => String(p.subcategory) === String(selectedSub.id))
    }

    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.trim().toLowerCase()
      list = list.filter((p) => {
        const nm = String(p.name || p.productName || p.inventoryName || '').toLowerCase()
        const cn = String(p.categoryName || '').toLowerCase()
        const sn = String(p.subcategoryName || '').toLowerCase()
        return nm.includes(t) || cn.includes(t) || sn.includes(t)
      })
    }

    return list
  }, [rawProducts, selectedCategory, selectedSub, searchTerm])

  useEffect(() => {
    if (selectedCategory === 'All') return
    if (isFilteringRef.current) return
    if (!Array.isArray(rawProducts)) return
    if (filteredProducts.length > 0) return
    if (!hasMore) return
    if (loading) return

    isFilteringRef.current = true
    const nextPage = currentPageRef.current + 1
    setCurrentPage((prev) => {
      const newVal = Math.max(prev, nextPage)
      currentPageRef.current = newVal
      return newVal
    })

    return () => {
      isFilteringRef.current = false
    }
  }, [selectedCategory, filteredProducts.length, rawProducts.length, hasMore, loading])

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return
    setIsLoadingMore(true)
    const nextPage = currentPageRef.current + 1
    setCurrentPage((prev) => {
      const newVal = Math.max(prev, nextPage)
      currentPageRef.current = newVal
      return newVal
    })
    setIsLoadingMore(false)
  }, [hasMore, isLoadingMore, loading])

  const onSelectCategory = useCallback((cat, index) => {
    setSearchTerm('')
    setSelectedSub(null)
    setSelectedCategory(cat || 'All')
    setSelectedProduct(null)

    if (categoriesRef.current && typeof index === 'number') {
      setTimeout(() => {
        try {
          categoriesRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
        } catch {
          categoriesRef.current?.scrollToOffset({ offset: index * 90, animated: true })
        }
      }, 100)
    }
  }, [])

  const onSelectSubcategory = useCallback((subcat) => {
    setSearchTerm('')
    setSelectedSub(subcat)
    setSelectedProduct(null)
  }, [])

  const onClearSubcategory = useCallback(() => {
    setSelectedSub(null)
    setSearchTerm('')
  }, [])

  const onSelectProduct = useCallback((product) => {
    console.log('[SELECT PRODUCT]', product)
    setSelectedProduct({ ...product, quantity: 1 })
    setModalVisible(true)
  }, [])

  const onCloseModal = useCallback(() => {
    setModalVisible(false)
    setTimeout(() => setSelectedProduct(null), 350)
  }, [])

  const onAddToCart = useCallback(() => {
    if (!selectedProduct) {
      console.warn('[ADD TO CART] No selected product')
      return
    }

    const resolvedId = String(
      selectedProduct.id ??
        selectedProduct._id ??
        selectedProduct.productId ??
        selectedProduct.sku ??
        `${(selectedProduct.name || selectedProduct.productName || 'product').replace(/\s+/g, '-')}-${Date.now()}`
    )

    const cartItem = {
      id: resolvedId,
      productId: resolvedId,
      sku: selectedProduct.sku ?? resolvedId,
      name: selectedProduct.name || selectedProduct.productName || 'Product',
      productName: selectedProduct.productName || selectedProduct.name || 'Product',
      price: Number(selectedProduct.price) || 0,
      quantity: Number(selectedProduct.quantity) || 1,
      imageUrl:
        selectedProduct.imageUrl ||
        selectedProduct.image ||
        selectedProduct.productimages?.[0]?.imageUrl ||
        null,
      category: selectedProduct.category ?? null,
      subcategory: selectedProduct.subcategory ?? null,
      product: selectedProduct,
      item: selectedProduct,
    }

    console.log('[ADD TO CART] payload:', cartItem)

    try {
      const result = dispatch(addItemToCart(cartItem))
      console.log('[ADD TO CART] dispatch result:', result)
    } catch (error) {
      console.error('[ADD TO CART] dispatch failed:', error)
      Alert.alert('Cart Error', error?.message || 'Failed to add item to cart')
      return
    }

    setModalVisible(false)

    setTimeout(() => {
      setSelectedProduct(null)
      Alert.alert(
        'Added to Cart',
        `${cartItem.name} x${cartItem.quantity} — KSH ${Number(cartItem.price).toLocaleString()}`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          {
            text: 'View Cart',
            onPress: () => router.push('/cart'),
          },
        ],
        { cancelable: true }
      )
    }, 250)
  }, [dispatch, selectedProduct, router])

  const renderProductCard = useCallback(
    ({ item }) => {
      const horizontalPadding = 30
      const totalAvailable = Math.max(0, width - horizontalPadding)
      const perCardGutter = 16
      const cardWidth = Math.floor((totalAvailable - numColumns * perCardGutter) / numColumns)
      const imageContainerHeight = isLandscape ? 140 : 200

      const matchId = String(item.id ?? item._id ?? item.productId ?? item.name ?? '').toLowerCase()
      const invStock = inventoryMap.has(matchId) ? inventoryMap.get(matchId) : null
      const availableQty =
        invStock ??
        item.quantity ??
        item.stock ??
        item.stockQuantity ??
        item.availableUnits ??
        item.inventoryCount ??
        null
      const isOutOfStock = availableQty !== null && Number(availableQty) <= 0

      console.log(
        `[RENDER CARD] Rendering product: ${item.name || item.productName} | ID: ${item.id} | Image: ${
          item.imageUrl || item.image || 'NONE'
        }`
      )

      return (
        <TouchableOpacity
          style={[styles.card, { width: cardWidth, margin: 8 }, isOutOfStock && { opacity: 0.6 }]}
          onPress={() => !isOutOfStock && onSelectProduct(item)}
          activeOpacity={isOutOfStock ? 1 : 0.7}
        >
          <View
            style={{
              width: '100%',
              height: imageContainerHeight,
              backgroundColor: '#f8f8f8',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <ProductImage product={item} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {isOutOfStock && (
              <View style={styles.outOfStockRibbon}>
                <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName} numberOfLines={2}>
            {item.name || item.productName || 'Unnamed Product'}
          </Text>

          <View style={styles.priceWrapper}>
            <Text style={styles.productPrice}>
              KSH {item.price != null ? Number(item.price).toLocaleString() : '0'}
            </Text>
          </View>
        </TouchableOpacity>
      )
    },
    [onSelectProduct, width, numColumns, isLandscape, inventoryMap]
  )

  const renderCategoryItem = useCallback(
    ({ item, index }) => {
      const isActive = String(selectedCategory?.id ?? selectedCategory) === String(item.id)
      const hasSubs = Array.isArray(item.subcategories) && item.subcategories.length > 0

      return (
        <TouchableOpacity
          onPress={() => onSelectCategory(item, index)}
          style={[styles.filterButton, isActive && styles.filterButtonActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.name}</Text>
          {hasSubs && (
            <Text style={{ marginLeft: 4, color: isActive ? '#fff' : '#666', fontSize: 10 }}>
              ▼
            </Text>
          )}
        </TouchableOpacity>
      )
    },
    [selectedCategory, onSelectCategory]
  )

  const keyExtractor = useCallback((item, index) => {
    const id = item?.id ?? item?._id ?? item?.productId
    return id ? String(id) : `product-${index}`
  }, [])

  const getItemLayout = useCallback(
    (data, index) => {
      const horizontalPadding = 30
      const totalAvailable = Math.max(0, width - horizontalPadding)
      const perCardGutter = 16
      const cardWidth = Math.floor((totalAvailable - numColumns * perCardGutter) / numColumns)
      const imageHeight = isLandscape ? 140 : 200
      const ITEM_HEIGHT = imageHeight + 120
      return {
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / numColumns),
        index,
      }
    },
    [width, numColumns, isLandscape]
  )

  const ListFooterComponent = useCallback(() => {
    if (isLoadingMore || loading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.footerText}>Loading more products...</Text>
        </View>
      )
    }

    if (!hasMore && Array.isArray(rawProducts) && rawProducts.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            {filteredProducts.length > 0
              ? `Showing ${filteredProducts.length} of ${rawProducts.length} products`
              : `Loaded all ${rawProducts.length} products`}
          </Text>
        </View>
      )
    }

    return null
  }, [isLoadingMore, loading, hasMore, rawProducts, filteredProducts.length])

  if (!initialLoadComplete) {
    return (
      <View style={styles.overlayContainer}>
        <View style={styles.overlayContent}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.overlayText}>Loading Arpella Stores...</Text>
          <Text style={styles.overlaySubtext}>Preparing products and categories</Text>
        </View>
      </View>
    )
  }

  if (error && (!Array.isArray(rawProducts) || rawProducts.length === 0)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{String(error)}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setInitialLoadComplete(false)
            initialLoadAttempted.current = false
            refetchProducts()
            refetchCats()
            refetchSubs()
            refetchInvs()
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.header, { paddingHorizontal: H_GUTTER }]}>
        <Text style={styles.title}>Arpella Stores</Text>
        <TouchableOpacity
          onPress={() => router.push('/cart')}
          accessibilityRole="button"
          accessibilityLabel="Open cart"
        >
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 24 + NAV_HEIGHT + Math.max(insets.bottom, 12),
          paddingHorizontal: 15,
        }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
        />

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
            nestedScrollEnabled={true}
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
                  <TouchableOpacity
                    onPress={() => onSelectSubcategory(item)}
                    style={[
                      styles.subcategoryButton,
                      String(selectedSub?.id) === String(item.id) &&
                        styles.subcategoryButtonActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.subcategoryText,
                        String(selectedSub?.id) === String(item.id) &&
                          styles.subcategoryTextActive,
                      ]}
                    >
                      {item.subcategoryName ?? item.name ?? 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListHeaderComponent={
                  selectedSub ? (
                    <TouchableOpacity
                      onPress={onClearSubcategory}
                      style={[styles.subcategoryButton, { backgroundColor: '#ff6b6b' }]}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="times" size={12} color="#fff" />
                      <Text style={[styles.subcategoryText, { color: '#fff', marginLeft: 4 }]}>
                        Clear
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                nestedScrollEnabled={true}
              />
            </View>
          </View>
        )}

        {(selectedCategory !== 'All' || selectedSub) && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersText}>
              Filters: {selectedCategory?.name ?? (selectedCategory === 'All' ? 'All' : '')}
              {selectedSub ? ` > ${selectedSub.subcategoryName ?? selectedSub.name}` : ''} (
              {filteredProducts.length} products)
            </Text>
          </View>
        )}

        <View style={styles.products}>
          {filteredProducts.length === 0 && !loading ? (
            <View style={styles.centered}>
              <FontAwesome name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
              {(selectedCategory !== 'All' || selectedSub) && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSelectedCategory('All')
                    setSelectedSub(null)
                    setSearchTerm('')
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              numColumns={numColumns}
              keyExtractor={keyExtractor}
              renderItem={renderProductCard}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={ListFooterComponent}
              key={`cols-${numColumns}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={getItemLayout}
              nestedScrollEnabled={true}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={onCloseModal}
        transparent={false}
      >
        <ScrollView
          contentContainerStyle={styles.modalScrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {selectedProduct && (
            <View style={styles.modalInner}>
              <View style={styles.closeButtonContainer}>
                <TouchableOpacity
                  onPress={onCloseModal}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close product modal"
                >
                  <FontAwesome name="close" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>
                {selectedProduct.name || selectedProduct.productName || 'Product'}
              </Text>

              <View style={styles.modalImageContainer}>
                <ProductImage
                  product={selectedProduct}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>

              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.modalPrice}>
                  KSH{' '}
                  {selectedProduct.price != null
                    ? Number(selectedProduct.price).toLocaleString()
                    : '0'}
                </Text>
              </View>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedProduct((p) => ({
                      ...p,
                      quantity: Math.max(1, (p.quantity || 1) - 1),
                    }))
                  }
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.qtyValue}>{selectedProduct.quantity}</Text>

                <TouchableOpacity
                  onPress={() =>
                    setSelectedProduct((p) => ({ ...p, quantity: (p.quantity || 1) + 1 }))
                  }
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
                <FontAwesome
                  name="shopping-cart"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Modal>

      <BottomNav cartCount={cartCount} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFF8E1',
  },
  title: { fontSize: 25, fontWeight: 'bold' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  categoriesWrapper: { height: 50, marginBottom: 10 },
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
    flexDirection: 'row',
  },
  filterButtonActive: { backgroundColor: '#5a2428' },
  filterText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  filterTextActive: { color: '#fff' },
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
  subcategoryContent: { alignItems: 'center', paddingHorizontal: 10, gap: 8 },
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
  subcategoryButtonActive: { backgroundColor: '#5a2428', borderColor: '#5a2428' },
  subcategoryText: { fontSize: 11, fontWeight: '600', color: '#333', textAlign: 'center' },
  subcategoryTextActive: { color: '#fff' },
  activeFiltersContainer: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
  },
  activeFiltersText: { fontSize: 12, color: '#1565c0', fontWeight: '600' },
  products: { minHeight: 400 },
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
  outOfStockRibbon: {
    position: 'absolute',
    top: 15,
    right: -30,
    backgroundColor: '#ff4d4f',
    paddingVertical: 4,
    paddingHorizontal: 30,
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
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
    overflow: 'hidden',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
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
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: '#5a2428',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  footerText: { marginTop: 10, fontSize: 14, color: '#5a2428', fontWeight: '600' },
  footerEnd: { paddingVertical: 16, alignItems: 'center' },
  footerEndText: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  modalScrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFF8E1',
    paddingTop: Platform.OS === 'android' ? 20 : 40,
    paddingBottom: 30,
  },
  modalInner: { alignItems: 'center', padding: 20 },
  closeButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 40,
    right: 20,
    zIndex: 10,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalImageContainer: {
    marginBottom: 20,
    width: Platform.OS === 'web' ? 320 : 180,
    height: 260,
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
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 2,
  },
  qtyText: { fontSize: 18, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'center' },
  addButton: {
    width: '80%',
    padding: 15,
    backgroundColor: '#5a2428',
    borderRadius: 5,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
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
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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
  overlaySubtext: { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' },
})

export default Home