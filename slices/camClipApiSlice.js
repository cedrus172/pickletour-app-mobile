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
    camClipGrants: builder.query({
      query: (venueId) => `/api/cam-clip/venues/${encodeURIComponent(venueId)}/grants`,
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
  useCamClipGrantsQuery,
  useAddCamClipGrantMutation,
  useSetCamClipConfigMutation,
  useRemoveCamClipGrantMutation,
} = camClipApiSlice;
