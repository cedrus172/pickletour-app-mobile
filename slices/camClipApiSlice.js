import { apiSlice } from "./apiSlice";

// Cắt Cam Sân (PickClip) — phân quyền qua backend trung tâm.
//  - my-access: venue user được xem/cắt (owner/manager/admin, grant thủ công, booking 48h).
//  - grants: chủ sân/admin cấp/thu hồi quyền + bật tắt + đặt Pi base URL.
export const camClipApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    myCamClipAccess: builder.query({
      query: () => `/api/cam-clip/my-access`,
      providesTags: ["CamClip"],
      keepUnusedDataFor: 30,
    }),
    // ADMIN: liệt kê venue để cấu hình + cấp quyền (q = tìm theo tên, kể cả chưa bật).
    adminCamClipVenues: builder.query({
      query: (q) => `/api/cam-clip/admin/venues${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      providesTags: ["CamClip"],
    }),
    camClipGrants: builder.query({
      query: (venueId) => `/api/cam-clip/venues/${encodeURIComponent(venueId)}/grants`,
      providesTags: (r, e, venueId) => [{ type: "CamClip", id: venueId }],
    }),
    // Danh sách camera của sân (proxy từ Pi) để chọn khi cấp quyền từng camera.
    camClipCameras: builder.query({
      query: (venueId) => `/api/cam-clip/venues/${encodeURIComponent(venueId)}/cameras`,
      providesTags: (r, e, venueId) => [{ type: "CamClip", id: venueId }],
    }),
    addCamClipGrant: builder.mutation({
      query: ({ venueId, ...body }) => ({
        url: `/api/cam-clip/venues/${encodeURIComponent(venueId)}/grants`,
        method: "POST",
        body,
      }),
      invalidatesTags: (r, e, { venueId }) => [{ type: "CamClip", id: venueId }, "CamClip"],
    }),
    setCamClipConfig: builder.mutation({
      query: ({ venueId, ...body }) => ({
        url: `/api/cam-clip/venues/${encodeURIComponent(venueId)}/config`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, { venueId }) => [{ type: "CamClip", id: venueId }, "CamClip"],
    }),
    updateCamClipGrant: builder.mutation({
      query: ({ id, venueId, ...body }) => ({
        url: `/api/cam-clip/grants/${encodeURIComponent(id)}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, { venueId }) => [{ type: "CamClip", id: venueId }, "CamClip"],
    }),
    removeCamClipGrant: builder.mutation({
      query: ({ id }) => ({
        url: `/api/cam-clip/grants/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, { venueId }) => [{ type: "CamClip", id: venueId }, "CamClip"],
    }),
  }),
});

export const {
  useMyCamClipAccessQuery,
  useAdminCamClipVenuesQuery,
  useCamClipGrantsQuery,
  useCamClipCamerasQuery,
  useAddCamClipGrantMutation,
  useUpdateCamClipGrantMutation,
  useSetCamClipConfigMutation,
  useRemoveCamClipGrantMutation,
} = camClipApiSlice;
