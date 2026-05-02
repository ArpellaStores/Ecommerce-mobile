import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
  ScrollView,
  Alert,
  unstable_batchedUpdates,
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
} from '../redux/api/productsApi'
import {
  setProducts,
  appendProducts,
  setCategories,
  setSubcategories,
} from '../redux/slices/productsSlice'
import BottomNav from '../components/BottomNav'
import ProductImage from '../components/ProductImage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const NAV_HEIGHT = 64
const H_GUTTER = 15
const EMPTY_ARR = Object.freeze([])

// ─── Memoised product card ────────────────────────────────────────────────────
// Extracted as a named component so React.memo works correctly and the card
// never re-renders unless its own data changes.
const ProductCard = React.memo(({ item, cardWidth, imageHeight, inventoryMap, onSelect }) => {
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, margin: 8 },
        isOutOfStock && { opacity: 0.6 },
        pressed && !isOutOfStock && { opacity: 0.82 },
      ]}
      onPress={() => !isOutOfStock && onSelect(item)}
      android_ripple={isOutOfStock ? null : { color: 'rgba(90,36,40,0.12)', borderless: false }}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <ProductImage product={item} style={styles.cardImage} resizeMode="cover" />
        {isOutOfStock ? (
          <View style={styles.outOfStockRibbon}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        ) : (
          <View style={styles.quickAddBadge}>
            <FontAwesome name="plus" size={12} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name || item.productName || 'Unnamed Product'}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>
            KSH {item.price != null ? Number(item.price).toLocaleString() : '0'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
})

// ─── Home ─────────────────────────────────────────────────────────────────────
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
    if (Array.isArray(items))
      return items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
    return Object.values(items).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
  }, [cartState])

  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const numColumns = isLandscape ? 4 : 2

  // Pre-calculate card dimensions once per layout change, not inside renderItem
  const cardDimensions = useMemo(() => {
    const totalAvailable = Math.max(0, width - 30)
    const perCardGutter = 16
    const cardWidth = Math.floor((totalAvailable - numColumns * perCardGutter) / numColumns)
    const imageHeight = isLandscape ? 140 : 200
    return { cardWidth, imageHeight }
  }, [width, numColumns, isLandscape])

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSub, setSelectedSub] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const currentPageRef = useRef(1)
  const lastFilterFetchRef = useRef(0)
  const categoriesRef = useRef(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (pageData?.items && !pageFetching) {
      if (currentPageRef.current === 1) {
        dispatch(setProducts(pageData.items))
      } else {
        dispatch(appendProducts({
          items: pageData.items,
          pageNumber: currentPageRef.current,
          hasMore: pageData.hasMore,
        }))
      }
    }
  }, [pageData, pageFetching, dispatch])

  useEffect(() => { if (catData) dispatch(setCategories(catData)) }, [catData, dispatch])
  useEffect(() => { if (subcatData) dispatch(setSubcategories(subcatData)) }, [subcatData, dispatch])
  useEffect(() => { if (!initialLoadComplete && !loading) setInitialLoadComplete(true) }, [loading, initialLoadComplete])

  const resolveCategoryName = (c) => c?.categoryName ?? c?.name ?? c?.title ?? 'Unknown'
  const resolveSubName = (s) => s?.subcategoryName ?? s?.name ?? s?.title ?? 'Unknown'

  const categories = useMemo(() => {
    const byCat = {}
    if (Array.isArray(rawSubcategories)) {
      rawSubcategories.forEach((sc) => {
        const parentId = sc.categoryId ?? sc.parentCategoryId ?? sc.catId ?? sc.category ?? null
        const id = sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory
        const name = resolveSubName(sc)
        if (parentId != null && id != null) {
          const key = String(parentId)
          byCat[key] = byCat[key] || []
          byCat[key].push({ ...sc, id, subcategoryName: name })
        }
      })
    }
    const cats = Array.isArray(rawCategories)
      ? rawCategories.map((c) => {
          const id = c.id ?? c._id ?? c.categoryId ?? c.category
          const name = resolveCategoryName(c)
          const subs =
            Array.isArray(c.subcategories) && c.subcategories.length > 0
              ? c.subcategories.map((sc) => ({
                  ...sc,
                  id: sc.id ?? sc._id ?? sc.subcategoryId ?? sc.subcategory,
                  subcategoryName: resolveSubName(sc),
                }))
              : byCat[String(id)] || []
          return { ...c, id, name, subcategories: subs }
        })
      : []
    return [{ id: 'All', name: 'All', subcategories: [] }, ...cats]
  }, [rawCategories, rawSubcategories])

  const isAllSelected = selectedCategory === 'All' || selectedCategory?.id === 'All'

  const subsOfSelected = useMemo(() => {
    if (isAllSelected) return EMPTY_ARR
    return (rawSubcategories || EMPTY_ARR).filter(
      (sc) => String(sc.categoryId) === String(selectedCategory?.id ?? selectedCategory)
    )
  }, [rawSubcategories, selectedCategory, isAllSelected])

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(rawProducts) ? rawProducts : []
    if (!isAllSelected) {
      const selId = selectedCategory?.id ?? selectedCategory
      list = list.filter((p) => String(p.category) === String(selId))
    }
    if (selectedSub) {
      list = list.filter((p) => String(p.subcategory) === String(selectedSub.id))
    }
    if (searchTerm && searchTerm.trim().length >= 3) {
      const t = searchTerm.trim().toLowerCase()
      list = list.filter((p) => {
        const nm = String(p.name || p.productName || p.inventoryName || '').toLowerCase()
        const cn = String(p.categoryName || '').toLowerCase()
        const sn = String(p.subcategoryName || '').toLowerCase()
        return nm.includes(t) || cn.includes(t) || sn.includes(t)
      })
    }
    return list
  }, [rawProducts, selectedCategory, selectedSub, searchTerm, isAllSelected])

  // Auto-fetch next page when filter returns empty but more pages exist
  useEffect(() => {
    if (isAllSelected && (!searchTerm || searchTerm.trim().length < 3)) return
    if (!Array.isArray(rawProducts) || filteredProducts.length > 0) return
    if (!hasMore || loading || pageFetching) return
    const now = Date.now()
    if (now - lastFilterFetchRef.current < 1000) return
    lastFilterFetchRef.current = now
    setCurrentPage((prev) => {
      const next = Math.max(prev, currentPageRef.current + 1)
      currentPageRef.current = next
      return next
    })
  }, [isAllSelected, searchTerm, filteredProducts.length, rawProducts.length, hasMore, loading, pageFetching])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || pageFetching) return
    setCurrentPage((prev) => {
      const next = prev + 1
      currentPageRef.current = next
      return next
    })
  }, [hasMore, loading, pageFetching])

  const onSelectCategory = useCallback((cat, index) => {
    unstable_batchedUpdates(() => {
      setSearchTerm('')
      setSelectedSub(null)
      setSelectedCategory(cat || 'All')
      setSelectedProduct(null)
    })
    if (categoriesRef.current && typeof index === 'number') {
      setTimeout(() => {
        try {
          categoriesRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
        } catch {
          categoriesRef.current?.scrollToOffset({ offset: index * 90, animated: true })
        }
      }, 80)
    }
  }, [])

  const onSelectSubcategory = useCallback((subcat) => {
    unstable_batchedUpdates(() => {
      setSearchTerm('')
      setSelectedSub(subcat)
      setSelectedProduct(null)
    })
  }, [])

  const onClearSubcategory = useCallback(() => {
    unstable_batchedUpdates(() => {
      setSelectedSub(null)
      setSearchTerm('')
    })
  }, [])

  const onSelectProduct = useCallback((product) => {
    unstable_batchedUpdates(() => {
      setSelectedProduct({ ...product, quantity: 1 })
      setModalVisible(true)
    })
  }, [])

  const onCloseModal = useCallback(() => {
    setModalVisible(false)
    setTimeout(() => setSelectedProduct(null), 300)
  }, [])

  const onAddToCart = useCallback(() => {
    if (!selectedProduct) return
    const resolvedId = String(
      selectedProduct.id ??
        selectedProduct._id ??
        selectedProduct.productId ??
        selectedProduct.sku ??
        `${(selectedProduct.name || 'product').replace(/\s+/g, '-')}-${Date.now()}`
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
    try {
      dispatch(addItemToCart(cartItem))
    } catch (err) {
      Alert.alert('Cart Error', err?.message || 'Failed to add item to cart')
      return
    }
    unstable_batchedUpdates(() => {
      setModalVisible(false)
      setSelectedProduct(null)
    })
    Alert.alert(
      'Added to Cart',
      `${cartItem.name} x${cartItem.quantity} — KSH ${Number(cartItem.price).toLocaleString()}`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ],
      { cancelable: true }
    )
  }, [dispatch, selectedProduct, router])

  // ── renderItem uses the memoised ProductCard component ──────────────────────
  const renderProductCard = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        cardWidth={cardDimensions.cardWidth}
        imageHeight={cardDimensions.imageHeight}
        inventoryMap={inventoryMap}
        onSelect={onSelectProduct}
      />
    ),
    [cardDimensions, inventoryMap, onSelectProduct]
  )

  const keyExtractor = useCallback((item, index) => {
    const id = item?.id ?? item?._id ?? item?.productId
    return id ? String(id) : `product-${index}`
  }, [])

  const getItemLayout = useCallback(
    (_, index) => {
      const ITEM_HEIGHT = cardDimensions.imageHeight + 120
      return {
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / numColumns),
        index,
      }
    },
    [cardDimensions.imageHeight, numColumns]
  )

  // ── ListHeaderComponent — replaces the outer ScrollView entirely ────────────
  // By putting the search/category/filter UI here, the single FlatList handles
  // ALL scrolling and virtualization works properly.
  const ListHeaderComponent = useCallback(() => (
    <View style={{ paddingHorizontal: H_GUTTER }}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        ref={categoriesRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.categoriesWrapper}
      >
        {categories.map((cat, index) => {
          const isActive = String(selectedCategory?.id ?? selectedCategory) === String(cat.id)
          const hasSubs = Array.isArray(cat.subcategories) && cat.subcategories.length > 0
          return (
            <Pressable
              key={String(cat.id)}
              onPress={() => onSelectCategory(cat, index)}
              android_ripple={{ color: 'rgba(90,36,40,0.15)', borderless: false }}
              style={({ pressed }) => [
                styles.filterButton,
                isActive && styles.filterButtonActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {cat.name}
              </Text>
              {hasSubs && (
                <Text style={{ marginLeft: 4, color: isActive ? '#fff' : '#666', fontSize: 10 }}>
                  ▼
                </Text>
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Subcategory chips */}
      {!isAllSelected && subsOfSelected.length > 0 && (
        <View style={styles.subcategoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoryContent}
          >
            {selectedSub && (
              <Pressable
                onPress={onClearSubcategory}
                android_ripple={{ color: 'rgba(255,107,107,0.3)', borderless: false }}
                style={({ pressed }) => [
                  styles.subcategoryButton,
                  { backgroundColor: '#ff6b6b' },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <FontAwesome name="times" size={12} color="#fff" />
                <Text style={[styles.subcategoryText, { color: '#fff', marginLeft: 4 }]}>
                  Clear
                </Text>
              </Pressable>
            )}
            {subsOfSelected.map((sub) => {
              const isActiveSub = String(selectedSub?.id) === String(sub.id)
              return (
                <Pressable
                  key={String(sub.id ?? sub._id ?? sub.subcategoryId)}
                  onPress={() => onSelectSubcategory(sub)}
                  android_ripple={{ color: 'rgba(90,36,40,0.15)', borderless: false }}
                  style={({ pressed }) => [
                    styles.subcategoryButton,
                    isActiveSub && styles.subcategoryButtonActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.subcategoryText, isActiveSub && styles.subcategoryTextActive]}>
                    {sub.subcategoryName ?? sub.name ?? 'Unknown'}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Active filter label */}
      {(!isAllSelected || selectedSub) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            Filters: {selectedCategory?.name ?? 'All'}
            {selectedSub ? ` > ${selectedSub.subcategoryName ?? selectedSub.name}` : ''}{' '}
            ({filteredProducts.length} products)
          </Text>
        </View>
      )}
    </View>
  ), [
    searchTerm,
    categories,
    selectedCategory,
    isAllSelected,
    subsOfSelected,
    selectedSub,
    filteredProducts.length,
    onSelectCategory,
    onSelectSubcategory,
    onClearSubcategory,
  ])

  const ListFooterComponent = useCallback(() => {
    if (pageFetching) {
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
  }, [pageFetching, hasMore, rawProducts, filteredProducts.length])

  const ListEmptyComponent = useCallback(() => {
    if (loading) return null
    return (
      <View style={[styles.centered, { marginTop: 60 }]}>
        <FontAwesome name="inbox" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No products found</Text>
        {(!isAllSelected || selectedSub) && (
          <Pressable
            style={styles.clearFiltersButton}
            onPress={() => {
              unstable_batchedUpdates(() => {
                setSelectedCategory('All')
                setSelectedSub(null)
                setSearchTerm('')
              })
            }}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </Pressable>
        )}
      </View>
    )
  }, [loading, isAllSelected, selectedSub])

  // ── Loading / error screens ─────────────────────────────────────────────────
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
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setInitialLoadComplete(false)
            refetchProducts(); refetchCats(); refetchSubs(); refetchInvs()
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: H_GUTTER }]}>
        <Text style={styles.title}>Arpella Stores</Text>
        <Pressable
          onPress={() => router.push('/cart')}
          android_ripple={{ color: 'rgba(90,36,40,0.2)', borderless: true, radius: 20 }}
          style={({ pressed }) => [styles.cartButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Open cart"
        >
          <FontAwesome name="shopping-cart" size={24} color="#333" />
          {cartCount > 0 && (
            <View style={styles.cartBadge} pointerEvents="none">
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/*
        THE KEY FIX: one single FlatList owns all scrolling.
        ListHeaderComponent contains search + categories + filters.
        This restores proper virtualization — only visible cards are rendered,
        so the JS thread is free to handle touches instantly.
      */}
      <FlatList
        data={filteredProducts}
        numColumns={numColumns}
        keyExtractor={keyExtractor}
        renderItem={renderProductCard}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        key={`cols-${numColumns}`}
        contentContainerStyle={{
          paddingBottom: 24 + NAV_HEIGHT + Math.max(insets.bottom, 12),
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={40}
        getItemLayout={getItemLayout}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* Product detail modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        onRequestClose={onCloseModal}
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selectedProduct && (
                <View style={styles.modalInner}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {selectedProduct.name || selectedProduct.productName || 'Product'}
                    </Text>
                    <Pressable
                      onPress={onCloseModal}
                      style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
                      android_ripple={{ color: '#ccc', borderless: true, radius: 16 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close product modal"
                      hitSlop={12}
                    >
                      <FontAwesome name="close" size={18} color="#333" />
                    </Pressable>
                  </View>

                  <View style={styles.modalImageWrapper}>
                    <ProductImage
                      product={selectedProduct}
                      style={styles.modalFullImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.modalInfo}>
                    <Text style={styles.modalPrice}>
                      KSH{' '}
                      {selectedProduct.price != null
                        ? Number(selectedProduct.price).toLocaleString()
                        : '0'}
                    </Text>

                    <Text style={styles.quantityLabel}>Select Quantity</Text>

                    <View style={styles.quantityRow}>
                      <Pressable
                        onPress={() =>
                          setSelectedProduct((p) => ({
                            ...p,
                            quantity: Math.max(1, (p.quantity || 1) - 1),
                          }))
                        }
                        style={({ pressed }) => [styles.qtyButton, pressed && { opacity: 0.65 }]}
                        android_ripple={{ color: 'rgba(90,36,40,0.2)', borderless: true, radius: 22 }}
                        hitSlop={8}
                      >
                        <FontAwesome name="minus" size={12} color="#5a2428" />
                      </Pressable>

                      <Text style={styles.qtyValue}>{selectedProduct.quantity}</Text>

                      <Pressable
                        onPress={() =>
                          setSelectedProduct((p) => ({ ...p, quantity: (p.quantity || 1) + 1 }))
                        }
                        style={({ pressed }) => [styles.qtyButton, pressed && { opacity: 0.65 }]}
                        android_ripple={{ color: 'rgba(90,36,40,0.2)', borderless: true, radius: 22 }}
                        hitSlop={8}
                      >
                        <FontAwesome name="plus" size={12} color="#5a2428" />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
                    onPress={onAddToCart}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    <FontAwesome name="shopping-cart" size={18} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.addButtonText}>Add to Cart</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNav cartCount={cartCount} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#FFF8E1',
    zIndex: 10,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#5a2428', letterSpacing: -0.5 },
  cartButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },
  categoriesWrapper: { marginBottom: 12 },
  filterContainer: { alignItems: 'center', paddingHorizontal: 2 },
  filterButton: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: { backgroundColor: '#5a2428', borderColor: '#5a2428' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#666' },
  filterTextActive: { color: '#fff' },
  subcategoriesWrapper: { marginBottom: 12 },
  subcategoryContent: {
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
    paddingVertical: 6,
  },
  subcategoryButton: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  subcategoryButtonActive: { backgroundColor: '#5a2428', borderColor: '#5a2428' },
  subcategoryText: { fontSize: 13, fontWeight: '600', color: '#555' },
  subcategoryTextActive: { color: '#fff' },
  activeFiltersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5a2428',
    elevation: 1,
  },
  activeFiltersText: { fontSize: 12, color: '#5a2428', fontWeight: '700' },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#fdfdfd',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: '100%' },
  quickAddBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5a2428',
    justifyContent: 'center',
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
  },
  outOfStockText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardContent: { padding: 12 },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    height: 38,
    lineHeight: 18,
  },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#5a2428' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 20 },
  retryButton: {
    backgroundColor: '#5a2428',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12, fontWeight: '600' },
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5a2428',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  clearFiltersText: { color: '#5a2428', fontWeight: 'bold', fontSize: 14 },
  footerLoader: { paddingVertical: 30, alignItems: 'center' },
  footerText: { marginTop: 10, fontSize: 13, color: '#5a2428', fontWeight: '600' },
  footerEnd: { paddingVertical: 20, alignItems: 'center' },
  footerEndText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
  },
  modalScrollContent: { flexGrow: 1 },
  modalInner: { padding: 24 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#333', marginRight: 15 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalImageWrapper: {
    width: '100%',
    height: 250,
    backgroundColor: '#fdfdfd',
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  modalFullImage: { width: '90%', height: '90%' },
  modalInfo: { alignItems: 'center', marginBottom: 24 },
  modalPrice: { fontSize: 26, fontWeight: '900', color: '#5a2428', marginBottom: 20 },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    padding: 5,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 2,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginHorizontal: 25,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    width: '100%',
    backgroundColor: '#5a2428',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 5,
  },
  addButtonText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  cartBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5a2428',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF8E1',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  overlayContainer: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 10,
    minWidth: 280,
  },
  overlayText: { marginTop: 20, fontSize: 20, fontWeight: '800', color: '#5a2428', textAlign: 'center' },
  overlaySubtext: { marginTop: 8, fontSize: 14, color: '#999', textAlign: 'center' },
})

export default Home