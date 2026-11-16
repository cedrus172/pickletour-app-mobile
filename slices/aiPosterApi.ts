import { apiSlice } from "./apiSlice";

// AI Poster: VĐV đã duyệt đăng ký tạo poster bằng AI (backend gọi OpenAI qua AI Gateway).
const aiPosterApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRegistrationAiPoster: builder.query<any, { tournamentId: string; regId: string }>({
      query: ({ tournamentId, regId }) =>
        `/api/tournaments/${tournamentId}/registrations/${regId}/ai-poster`,
      keepUnusedDataFor: 0,
    }),
    createRegistrationAiPoster: builder.mutation<any, { tournamentId: string; regId: string; body: FormData }>({
      query: ({ tournamentId, regId, body }) => ({
        url: `/api/tournaments/${tournamentId}/registrations/${regId}/ai-poster`,
        method: "POST",
        body,
      }),
    }),
    uploadAiPosterTemplate: builder.mutation<any, { tournamentId: string; body: FormData }>({
      query: ({ tournamentId, body }) => ({
        url: `/api/tournaments/${tournamentId}/ai-poster/template`,
        method: "POST",
        body,
      }),
    }),
    setLegacyPosterEnabled: builder.mutation<any, { tournamentId: string; enabled: boolean }>({
      query: ({ tournamentId, enabled }) => ({
        url: `/api/tournaments/${tournamentId}/legacy-poster`,
        method: "PUT",
        body: { enabled },
      }),
    }),
  }),
});

export const {
  useGetRegistrationAiPosterQuery,
  useCreateRegistrationAiPosterMutation,
  useUploadAiPosterTemplateMutation,
  useSetLegacyPosterEnabledMutation,
} = aiPosterApi;
