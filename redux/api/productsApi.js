import { api } from "./index";

export const productsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPagedProducts: builder.query({
      query: ({ pageNumber = 1, pageSize = 50 } = {}) =>
        `/paged-products?platform=mobile&pageNumber=${pageNumber}&pageSize=${pageSize}`,
      providesTags: ["Products"],
      transformResponse: (response) => {
        const items = Array.isArray(response)
          ? response
          : response?.items ?? [];
        return {
          items,
          hasMore: items.length === 50,
        };
      },
    }),

    getCategories: builder.query({
      query: () => "/categories?platform=mobile",
      providesTags: ["Categories"],
      transformResponse: (response) =>
        Array.isArray(response) ? response : [],
    }),

    getInventories: builder.query({
      query: () => "/inventories?platform=mobile&pageNumber=1&pageSize=10000",
      transformResponse: (response) =>
        Array.isArray(response) ? response : [],
    }),

    getSubcategories: builder.query({
      query: () => "/subcategories?platform=mobile",
      providesTags: ["Categories"],
      transformResponse: (response) =>
        Array.isArray(response) ? response : [],
    }),

    getProductImage: builder.query({
      query: (productId) => `/product-image/${productId}?platform=mobile`,
      transformResponse: (response) => {
        let imageData = Array.isArray(response) ? response[0] : response;
        if (imageData && typeof imageData === "object" && imageData["0"]) {
          imageData = imageData["0"];
        }
        return {
          imageUrl: imageData?.imageUrl ?? null,
          id: imageData?.id ?? imageData?.imageId ?? null,
          isPrimary: Boolean(imageData?.isPrimary),
        };
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetPagedProductsQuery,
  useGetCategoriesQuery,
  useGetInventoriesQuery,
  useGetSubcategoriesQuery,
  useGetProductImageQuery,
} = productsApi;
