import React, { useMemo, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useDispatch, useSelector } from 'react-redux'
import { useGetProductImageQuery } from '../redux/api/productsApi'
import { setProductImageData } from '../redux/slices/productsSlice'

const PLACEHOLDER = 'https://via.placeholder.com/150x150/f0f0f0/999999?text=No+Image'
const BLURHASH =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

const ProductImage = React.memo(({ product, style, resizeMode = 'cover' }) => {
  const dispatch = useDispatch()
  const productId = useMemo(
    () => product?.id ?? product?._id ?? product?.productId ?? product?.sku ?? null,
    [product]
  )

  const storeImage = useSelector((state) =>
    productId ? state.products?.productImages?.[productId] : undefined
  )

  const baseUri = useMemo(
    () =>
      storeImage?.imageUrl ??
      product?.imageUrl ??
      product?.image ??
      product?.productimages?.[0]?.imageUrl ??
      null,
    [storeImage?.imageUrl, product?.imageUrl, product?.image, product?.productimages]
  )

  const { data: fetchedImageData } = useGetProductImageQuery(productId, {
    skip: !!baseUri || !productId,
  })

  const uri = useMemo(() => baseUri || fetchedImageData?.imageUrl || null, [
    baseUri,
    fetchedImageData,
  ])

  useEffect(() => {
    if (fetchedImageData?.imageUrl && productId) {
      dispatch(
        setProductImageData({
          productId,
          imageUrl: fetchedImageData.imageUrl,
          id: fetchedImageData.id,
        })
      )
    }
  }, [fetchedImageData, productId, dispatch])

  if (!uri) {
    return (
      <View style={[styles.placeholderContainer, style]}>
        <Image
          source={{ uri: PLACEHOLDER }}
          style={{ width: style?.width || 100, height: style?.height || 100 }}
          contentFit="cover"
        />
        <Text style={styles.noImageText}>No image</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri }}
      style={[{ backgroundColor: '#f8f8f8', width: '100%', height: '100%' }, style]}
      contentFit={resizeMode === 'cover' ? 'cover' : 'contain'}
      placeholder={{ blurhash: BLURHASH }}
      transition={200}
      cachePolicy="memory-disk"
    />
  )
})

ProductImage.displayName = 'ProductImage'

export default ProductImage

const styles = StyleSheet.create({
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  noImageText: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
  },
})

