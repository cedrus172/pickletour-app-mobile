import { apiSlice } from "./apiSlice"; // baseQuery đã set credentials

export const matchesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    adminPatchMatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/matches/${id}/admin`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (res, err, { id }) => [{ type: "Match", id }],
    }),
    // Cài đặt trận — bestOf / pointsToWin / winByTwo / cap / timeouts
    // (mirror web useUpdateMatchSettingsMutation)
    updateMatchSettings: builder.mutation({
      query: ({ matchId, ...body }) => ({
        url: `/api/matches/${matchId}/update`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (res, err, { matchId }) => [
        { type: "Match", id: matchId },
      ],
    }),
    // Swap đội giữa 2 trận (mirror web useAdminSwapMatchTeamsMutation)
    adminSwapMatchTeams: builder.mutation({
      query: ({ id, targetMatchId }) => ({
        url: `/api/matches/${id}/admin/swap-teams`,
        method: "POST",
        body: { targetMatchId },
      }),
      invalidatesTags: (res, err, { id, targetMatchId }) => [
        { type: "Match", id },
        { type: "Match", id: targetMatchId },
      ],
    }),
    // Lịch sử điểm từng pha (replay matchliveevents) — dùng cho biểu đồ diễn biến điểm
    getMatchScoreTimeline: builder.query({
      query: (id) => `/api/matches/${id}/score-timeline`,
      providesTags: (res, err, id) => [{ type: "Match", id }],
    }),
  }),
});

export const {
  useAdminPatchMatchMutation,
  useUpdateMatchSettingsMutation,
  useAdminSwapMatchTeamsMutation,
  useGetMatchScoreTimelineQuery,
} = matchesApiSlice;
