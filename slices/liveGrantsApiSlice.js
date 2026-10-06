import { apiSlice } from "./apiSlice";

// Quyền Livestream: operator xem quyền của mình; chủ giải cấp/thu hồi, mời QR,
// giám sát + dừng từ xa. (Nhóm 2/3 — mobile)
export const liveGrantsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Operator: các giải (+sân) mình được cấp Quyền Livestream.
    myLiveGrants: builder.query({
      query: () => `/api/tournament-auto-live/my-live-grants`,
      providesTags: ["LiveGrants"],
      keepUnusedDataFor: 15,
    }),
    // Nhận quyền từ link/QR mời (đã đăng nhập).
    claimLiveInvite: builder.mutation({
      query: (body) => ({
        url: `/api/tournament-auto-live/claim-live`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["LiveGrants"],
    }),
    // Chủ giải: danh sách người đã được cấp.
    listLivestreamers: builder.query({
      query: (tid) =>
        `/api/tournament-auto-live/livestreamers?tournament=${encodeURIComponent(tid)}`,
      providesTags: (r, e, tid) => [{ type: "LiveGrants", id: tid }],
    }),
    upsertLivestreamer: builder.mutation({
      query: (body) => ({
        url: `/api/tournament-auto-live/livestreamers`,
        method: "POST",
        body,
      }),
      invalidatesTags: (r, e, b) => [
        { type: "LiveGrants", id: b?.tournament },
        { type: "LiveAudit", id: b?.tournament },
      ],
    }),
    deleteLivestreamer: builder.mutation({
      query: ({ id }) => ({
        url: `/api/tournament-auto-live/livestreamers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, a) => [
        { type: "LiveGrants", id: a?.tournament },
        { type: "LiveMonitor", id: a?.tournament },
        { type: "LiveAudit", id: a?.tournament },
      ],
    }),
    createLiveInvite: builder.mutation({
      query: (body) => ({
        url: `/api/tournament-auto-live/live-invite`,
        method: "POST",
        body,
      }),
    }),
    // Chủ giải: sân của giải (để giới hạn khi cấp quyền).
    getAutoLiveCourts: builder.query({
      query: (tid) =>
        `/api/tournament-auto-live/tournaments/${encodeURIComponent(tid)}/courts`,
    }),
    // Chủ giải: giám sát phiên live đang chạy.
    listTournamentLiveSessions: builder.query({
      query: (tid) =>
        `/api/tournament-auto-live/livestreamers/sessions?tournament=${encodeURIComponent(tid)}`,
      providesTags: (r, e, tid) => [{ type: "LiveMonitor", id: tid }],
    }),
    ownerStopLiveSession: builder.mutation({
      query: ({ id }) => ({
        url: `/api/tournament-auto-live/livestreamers/sessions/${id}/stop`,
        method: "POST",
      }),
      invalidatesTags: (r, e, a) => [
        { type: "LiveMonitor", id: a?.tournament },
        { type: "LiveAudit", id: a?.tournament },
      ],
    }),
    // Nhật ký thao tác Quyền Livestream (Nhóm 5).
    listLivestreamAudit: builder.query({
      query: (tid) =>
        `/api/tournament-auto-live/livestreamers/audit?tournament=${encodeURIComponent(tid)}`,
      providesTags: (r, e, tid) => [{ type: "LiveAudit", id: tid }],
    }),
  }),
});

export const {
  useMyLiveGrantsQuery,
  useClaimLiveInviteMutation,
  useListLivestreamersQuery,
  useUpsertLivestreamerMutation,
  useDeleteLivestreamerMutation,
  useCreateLiveInviteMutation,
  useGetAutoLiveCourtsQuery,
  useListTournamentLiveSessionsQuery,
  useOwnerStopLiveSessionMutation,
  useListLivestreamAuditQuery,
} = liveGrantsApiSlice;
