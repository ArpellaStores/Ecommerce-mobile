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
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'
import { useGetProductImageQuery } from '../redux/api/productsApi'
import { setProductImageData } from '../redux/slices/productsSlice'

const PLACEHOLDER = 'https://via.placeholder.com/150x150/f0f0f0/999999?text=No+Image'

// ─── Image Caching Helpers ──────────────────────────────────────────────────
const pathCache = new Map()

const getCachedFilePath = async (uri) => {
  if (!uri) return null
  if (pathCache.has(uri)) return pathCache.get(uri)

  let hash
  try {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, uri)
  } catch (e) {
    hash = uri.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
  }

  const extMatch = uri.match(/\.(png|jpg|jpeg|webp)(\?.*)?$/i)
  const ext = extMatch ? extMatch[1] : 'jpg'
  const dir = `${FileSystem.cacheDirectory}images/`
  const path = `${dir}${hash}.${ext}`
  const result = { dir, path }

  pathCache.set(uri, result)
  return result
}

const ensureImageCached = async (uri, token = null) => {
  if (!uri) return null
  try {
    const { dir, path } = await getCachedFilePath(uri)
    const info = await FileSystem.getInfoAsync(path)
    if (info.exists) return path

    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})

    const downloadUri = uri.includes('?') ? `${uri}&platform=mobile` : `${uri}?platform=mobile`
    
    const downloadOptions = {}
    if (token && uri.includes('arpellastore.com')) {
      downloadOptions.headers = { Authorization: `Bearer ${token}` }
    }

    const res = await FileSystem.downloadAsync(downloadUri, path, downloadOptions)
    if (res && (res.status === 200 || typeof res.status === 'undefined')) return path

    await FileSystem.deleteAsync(path).catch(() => {})
    return null
  } catch (e) {
    console.error('[IMAGE CACHE] download error:', e)
    return null
  }
}

const ProductImage = memo(
  ({ product, style, resizeMode = 'cover' }) => {
    const dispatch = useDispatch()
    const authToken = useSelector((state) => state.auth?.token)
    const prefetched = useRef(new Set())
    const noImageTimer = useRef(null)
    const mountedRef = useRef(true)

    useEffect(() => {
      mountedRef.current = true
      return () => {
        mountedRef.current = false
        if (noImageTimer.current) {
          clearTimeout(noImageTimer.current)
          noImageTimer.current = null
        }
      }
    }, [])

    const productId = useMemo(
      () => product?.id ?? product?._id ?? product?.productId ?? product?.sku ?? null,
      [product]
    )

    useEffect(() => {
      prefetched.current = new Set()
    }, [productId])

    const storeImage = useSelector((state) =>
      productId ? state.products?.productImages?.[productId] : undefined
    )
    const isImageLoadingInStore = storeImage?.loading || false

    const baseUri = useMemo(
      () =>
        storeImage?.imageUrl ??
        product?.imageUrl ??
        product?.image ??
        product?.productimages?.[0]?.imageUrl ??
        null,
      [storeImage?.imageUrl, product?.imageUrl, product?.image, product?.productimages]
    )

    // Trigger RTK Query if no image is found in product object or store
    const { data: fetchedImageData, isLoading: isFetchingQuery } = useGetProductImageQuery(productId, {
      skip: !!baseUri || !productId,
    })

    const uri = useMemo(() => baseUri || fetchedImageData?.imageUrl || null, [
      baseUri,
      fetchedImageData,
    ])

    const isImageLoading = isImageLoadingInStore || (isFetchingQuery && !uri)

  useEffect(() => {
    if (fetchedImageData?.imageUrl && productId) {
      dispatch(setProductImageData({ 
        productId, 
        imageUrl: fetchedImageData.imageUrl, 
        id: fetchedImageData.id 
      }))
    }
  }, [fetchedImageData, productId, dispatch])

    const [imageState, setImageState] = useState({
      showSpinner: false,
      showNoImage: false,
      loadError: false,
      cachedUri: null,
    })

    useEffect(() => {
      if (noImageTimer.current) {
        clearTimeout(noImageTimer.current)
        noImageTimer.current = null
      }

      if (isImageLoading) {
        if (!uri) setImageState((prev) => ({ ...prev, showSpinner: true, showNoImage: false }))
        return
      }

      if (uri) {
        setImageState((prev) => ({ ...prev, showSpinner: false, showNoImage: false }))
        return
      }

      noImageTimer.current = setTimeout(() => {
        if (mountedRef.current) {
          setImageState((prev) => ({ ...prev, showSpinner: false, showNoImage: true }))
        }
        noImageTimer.current = null
      }, 700)

      return () => {
        if (noImageTimer.current) {
          clearTimeout(noImageTimer.current)
          noImageTimer.current = null
        }
      }
    }, [isImageLoading, uri])

    useEffect(() => {
      let canceled = false

      const doCache = async (u) => {
        if (!u) return
        try {
          if (prefetched.current.has(u)) {
            const { path } = await getCachedFilePath(u)
            const info = await FileSystem.getInfoAsync(path)
            if (info.exists) {
              if (!canceled) setImageState((prev) => ({ ...prev, cachedUri: path }))
              return
            }
          }

          const local = await ensureImageCached(u, authToken)
          if (!canceled) {
            if (local) {
              prefetched.current.add(u)
              setImageState((prev) => ({ ...prev, cachedUri: local }))
            } else {
              setImageState((prev) => ({ ...prev, cachedUri: null }))
            }
          }
        } catch {
          if (!canceled) setImageState((prev) => ({ ...prev, cachedUri: null }))
        }
      }

      doCache(uri)

      return () => {
        canceled = true
      }
    }, [uri, authToken])

    const onError = useCallback(() => {
      setImageState((prev) => ({ ...prev, loadError: true, showSpinner: false }))
    }, [])

    if (imageState.showSpinner) {
      return (
        <View
          style={[
            { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
            style,
          ]}
        >
          <ActivityIndicator size="small" color="#5a2428" />
        </View>
      )
    }

    const displayUri =
      (imageState.cachedUri &&
        (imageState.cachedUri.startsWith('file://')
          ? imageState.cachedUri
          : `file://${imageState.cachedUri}`)) ||
      uri

    if (displayUri && !imageState.loadError) {
      return (
        <Image
          source={{ uri: displayUri }}
          style={[{ width: '100%', height: '100%' }, style]}
          resizeMode={resizeMode}
          onError={onError}
        />
      )
    }

    if (imageState.loadError || imageState.showNoImage) {
      return (
        <View
          style={[
            { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
            style,
          ]}
        >
          <Image
            source={{ uri: PLACEHOLDER }}
            style={{ width: style?.width || 100, height: style?.height || 100, resizeMode: 'cover' }}
          />
          <Text style={{ color: '#888', fontSize: 12, marginTop: 6 }}>No image</Text>
        </View>
      )
    }

    return <View style={[{ backgroundColor: '#f8f8f8' }, style]} />
  },
  (prev, next) => {
    const prevId = prev.product?.id ?? prev.product?._id ?? prev.product?.productId
    const nextId = next.product?.id ?? next.product?._id ?? next.product?.productId
    return prevId === nextId && prev.resizeMode === next.resizeMode
  }
)

ProductImage.displayName = 'ProductImage'

export default ProductImage

const styles = StyleSheet.create({})
