// slices/shopApiSlice.js — Gian hàng độc quyền GOATWIN (xem, đặt hàng, đơn của tôi) + quản lý gian hàng trong app.
import { useSelector } from "react-redux";
import { apiSlice } from "./apiSlice";

export const shopApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getShop: builder.query({ query: () => "/api/shop", providesTags: ["Shop"], keepUnusedDataFor: 120 }),
    getShopProducts: builder.query({
      query: (category) => `/api/shop/products${category ? `?category=${category}` : ""}`,
      providesTags: ["Shop"],
    }),
    getShopProduct: builder.query({ query: (id) => `/api/shop/products/${id}`, providesTags: ["Shop"] }),
    createShopOrder: builder.mutation({
      query: (body) => ({ url: "/api/shop/orders", method: "POST", body }),
      invalidatesTags: ["ShopOrder", "ShopManage"],
    }),
    getMyShopOrders: builder.query({ query: () => "/api/shop/orders/mine", providesTags: ["ShopOrder"] }),
    getShopOrder: builder.query({ query: (id) => `/api/shop/orders/${id}`, providesTags: ["ShopOrder"] }),
    cancelShopOrder: builder.mutation({
      query: (id) => ({ url: `/api/shop/orders/${id}/cancel`, method: "POST" }),
      invalidatesTags: ["ShopOrder", "ShopManage"],
    }),

    // Quản lý gian hàng (admin / người được cấp quyền)
    getManageProducts: builder.query({ query: () => "/api/shop/manage/products", providesTags: ["ShopManage"] }),
    saveManageProduct: builder.mutation({
      query: ({ _id, ...body }) => ({ url: `/api/shop/manage/products${_id ? `/${_id}` : ""}`, method: _id ? "PUT" : "POST", body }),
      invalidatesTags: ["ShopManage", "Shop"],
    }),
    deleteManageProduct: builder.mutation({
      query: (id) => ({ url: `/api/shop/manage/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["ShopManage", "Shop"],
    }),
    getManageOrders: builder.query({
      query: ({ status = "", q = "" } = {}) => `/api/shop/manage/orders?status=${status}&q=${encodeURIComponent(q)}`,
      providesTags: ["ShopManage"],
    }),
    getManageOrder: builder.query({ query: (id) => `/api/shop/manage/orders/${id}`, providesTags: ["ShopManage"] }),
    scanManageOrder: builder.mutation({ query: (code) => ({ url: `/api/shop/manage/orders/scan/${encodeURIComponent(code)}` }) }),
    updateManageOrder: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/shop/manage/orders/${id}`, method: "PATCH", body }),
      invalidatesTags: ["ShopManage", "ShopOrder"],
    }),
  }),
});

export const {
  useGetShopQuery,
  useGetShopProductsQuery,
  useGetShopProductQuery,
  useCreateShopOrderMutation,
  useGetMyShopOrdersQuery,
  useGetShopOrderQuery,
  useCancelShopOrderMutation,
  useGetManageProductsQuery,
  useSaveManageProductMutation,
  useDeleteManageProductMutation,
  useGetManageOrdersQuery,
  useGetManageOrderQuery,
  useScanManageOrderMutation,
  useUpdateManageOrderMutation,
} = shopApiSlice;

/** Thông tin gian hàng theo người đang đăng nhập (đổi tài khoản → tải lại: chế độ "chỉ admin + người quản lý"). */
export function useShopInfo() {
  const token = useSelector((s) => s?.auth?.userInfo?.token);
  return shopApiSlice.useGetShopQuery(token ? String(token).slice(-12) : "guest");
}
