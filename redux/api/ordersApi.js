import { api } from "./index";

/**
 * @typedef {Object} OrderItem
 * @property {number} productId
 * @property {number} quantity
 * @property {string|null} priceType
 */

/**
 * @typedef {Object} Order
 * @property {string} orderid
 * @property {string} userId
 * @property {string} phoneNumber
 * @property {string} status
 * @property {number} total
 * @property {string} buyerPin
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} orderPaymentType
 * @property {string} orderSource
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {OrderItem[]} orderitems
 */


export const ordersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: () => "/orders?platform=mobile",
      providesTags: ["Orders"],
      transformResponse: (response) => {
        console.log(response)
        if (Array.isArray(response)) return response;
        if (response?.items && Array.isArray(response.items)) return response.items;
        if (response?.data && Array.isArray(response.data)) return response.data;
        return [];
      },

    }),
  }),
  overrideExisting: true,
});

export const { useGetOrdersQuery } = ordersApi;
