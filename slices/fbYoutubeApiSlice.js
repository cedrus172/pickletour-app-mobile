import { apiSlice } from "./apiSlice";

// Tải VOD live fanpage Facebook → upload YouTube (admin mobile).
export const fbYoutubeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    fbytPages: builder.query({
      query: () => `/api/admin/fb-youtube/pages`,
      keepUnusedDataFor: 30,
    }),
    fbytLives: builder.query({
      query: ({ pageId, limit = 25 }) =>
        `/api/admin/fb-youtube/pages/${encodeURIComponent(pageId)}/lives?limit=${limit}`,
      keepUnusedDataFor: 0,
    }),
    fbytJobs: builder.query({
      query: ({ pageId } = {}) =>
        `/api/admin/fb-youtube/jobs${pageId ? `?pageId=${encodeURIComponent(pageId)}` : ""}`,
      keepUnusedDataFor: 0,
    }),
    fbytUpload: builder.mutation({
      query: (body) => ({ url: `/api/admin/fb-youtube/upload`, method: "POST", body }),
    }),
    fbytRetry: builder.mutation({
      query: (id) => ({ url: `/api/admin/fb-youtube/jobs/${id}/retry`, method: "POST" }),
    }),
    fbytUpdateMeta: builder.mutation({
      query: ({ id, title, description }) => ({
        url: `/api/admin/fb-youtube/jobs/${id}/meta`,
        method: "PATCH",
        body: { title, description },
      }),
    }),
    fbytDelete: builder.mutation({
      query: (id) => ({ url: `/api/admin/fb-youtube/jobs/${id}`, method: "DELETE" }),
    }),
  }),
});

export const {
  useFbytPagesQuery,
  useFbytLivesQuery,
  useFbytJobsQuery,
  useFbytUploadMutation,
  useFbytRetryMutation,
  useFbytUpdateMetaMutation,
  useFbytDeleteMutation,
} = fbYoutubeApiSlice;
