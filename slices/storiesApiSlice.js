// slices/storiesApiSlice.js — Story (ảnh/video ngắn ở đầu Bảng tin)
import { apiSlice } from "./apiSlice";

export const storiesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStoryFeed: builder.query({
      // page: chỉ story của một Fanpage (màn Fanpage); bỏ trống = thanh story Bảng tin
      query: (page) => ({ url: page ? `/api/stories/feed?page=${page}` : `/api/stories/feed`, method: "GET" }),
      providesTags: [{ type: "Story", id: "FEED" }],
      keepUnusedDataFor: 120,
    }),
    createStory: builder.mutation({
      query: (body) => ({ url: `/api/stories`, method: "POST", body }),
      invalidatesTags: [{ type: "Story", id: "FEED" }],
    }),
    viewStory: builder.mutation({
      query: (id) => ({ url: `/api/stories/${id}/view`, method: "POST" }),
    }),
    getStoryViewers: builder.query({
      query: (id) => ({ url: `/api/stories/${id}/viewers`, method: "GET" }),
      keepUnusedDataFor: 15,
    }),
    deleteStory: builder.mutation({
      query: (id) => ({ url: `/api/stories/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Story", id: "FEED" }],
    }),
    reportStory: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/api/stories/${id}/report`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: [{ type: "Story", id: "FEED" }],
    }),
  }),
});

export const {
  useGetStoryFeedQuery,
  useCreateStoryMutation,
  useViewStoryMutation,
  useGetStoryViewersQuery,
  useDeleteStoryMutation,
  useReportStoryMutation,
} = storiesApiSlice;
