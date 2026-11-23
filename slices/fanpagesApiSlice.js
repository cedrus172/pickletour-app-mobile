// slices/fanpagesApiSlice.js — Fanpage: trang CLB/BTC/sân/thương hiệu, nhiều người cùng đăng,
// chia quyền (owner/admin/editor), tạo trang phải được admin duyệt.
import { apiSlice } from "./apiSlice";

export const fanpagesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Trang tôi quản lý (mọi trạng thái) + postable (bộ chọn "Đăng dưới tên") + isSiteAdmin
    getMyFanpages: builder.query({
      query: () => ({ url: `/api/fanpages/mine`, method: "GET" }),
      providesTags: [{ type: "Fanpage", id: "MINE" }],
      keepUnusedDataFor: 300,
    }),
    listFanpages: builder.query({
      query: ({ q = "", kind = "" } = {}) => {
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (kind) p.set("kind", kind);
        const qs = p.toString();
        return { url: `/api/fanpages${qs ? `?${qs}` : ""}`, method: "GET" };
      },
      providesTags: [{ type: "Fanpage", id: "LIST" }],
    }),
    getFanpage: builder.query({
      query: (idOrSlug) => ({ url: `/api/fanpages/${idOrSlug}`, method: "GET" }),
      providesTags: (r, e, id) => [{ type: "Fanpage", id }, { type: "Fanpage", id: r?._id }],
    }),
    createFanpage: builder.mutation({
      query: (body) => ({ url: `/api/fanpages`, method: "POST", body }),
      invalidatesTags: [{ type: "Fanpage", id: "MINE" }],
    }),
    updateFanpage: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/fanpages/${id}`, method: "PATCH", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Fanpage", id }, { type: "Fanpage", id: "MINE" }, { type: "Fanpage", id: "LIST" }],
    }),
    deleteFanpage: builder.mutation({
      query: (id) => ({ url: `/api/fanpages/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Fanpage", id: "MINE" }, { type: "Fanpage", id: "LIST" }],
    }),
    followFanpage: builder.mutation({
      query: ({ id, follow }) => ({ url: `/api/fanpages/${id}/follow`, method: follow ? "POST" : "DELETE" }),
      invalidatesTags: (r, e, { id }) => [{ type: "Fanpage", id }, { type: "Fanpage", id: "LIST" }],
    }),
    getFanpageMembers: builder.query({
      query: (id) => ({ url: `/api/fanpages/${id}/members`, method: "GET" }),
      providesTags: (r, e, id) => [{ type: "Fanpage", id: `members-${id}` }],
    }),
    addFanpageMember: builder.mutation({
      query: ({ id, userId, role }) => ({ url: `/api/fanpages/${id}/members`, method: "POST", body: { userId, role } }),
      invalidatesTags: (r, e, { id }) => [{ type: "Fanpage", id: `members-${id}` }],
    }),
    updateFanpageMember: builder.mutation({
      query: ({ id, userId, role }) => ({ url: `/api/fanpages/${id}/members/${userId}`, method: "PATCH", body: { role } }),
      invalidatesTags: (r, e, { id }) => [{ type: "Fanpage", id: `members-${id}` }, { type: "Fanpage", id }, { type: "Fanpage", id: "MINE" }],
    }),
    removeFanpageMember: builder.mutation({
      query: ({ id, userId }) => ({ url: `/api/fanpages/${id}/members/${userId}`, method: "DELETE" }),
      invalidatesTags: (r, e, { id }) => [{ type: "Fanpage", id: `members-${id}` }, { type: "Fanpage", id: "MINE" }],
    }),
    // Admin hệ thống duyệt trang
    adminListFanpages: builder.query({
      query: (status = "pending") => ({ url: `/api/admin/fanpages?status=${status}`, method: "GET" }),
      providesTags: [{ type: "Fanpage", id: "ADMIN" }],
    }),
    adminReviewFanpage: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/admin/fanpages/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Fanpage", id: "ADMIN" }, { type: "Fanpage", id: "LIST" }, { type: "Fanpage", id: "MINE" }],
    }),
  }),
});

export const {
  useGetMyFanpagesQuery,
  useListFanpagesQuery,
  useGetFanpageQuery,
  useCreateFanpageMutation,
  useUpdateFanpageMutation,
  useDeleteFanpageMutation,
  useFollowFanpageMutation,
  useGetFanpageMembersQuery,
  useAddFanpageMemberMutation,
  useUpdateFanpageMemberMutation,
  useRemoveFanpageMemberMutation,
  useAdminListFanpagesQuery,
  useAdminReviewFanpageMutation,
} = fanpagesApiSlice;

export const FANPAGE_KIND_LABEL = {
  club: "Câu lạc bộ",
  organizer: "Ban tổ chức",
  venue: "Sân",
  brand: "Thương hiệu",
  community: "Cộng đồng",
  official: "Trang chính thức",
};

export const FANPAGE_ROLE_LABEL = {
  owner: "Chủ sở hữu",
  admin: "Quản trị viên",
  editor: "Biên tập viên",
};
