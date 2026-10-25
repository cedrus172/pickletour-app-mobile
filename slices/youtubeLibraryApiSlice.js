import { apiSlice } from "./apiSlice";

// Kho clip YouTube PickleTour (public): video + live từ các kênh của PickleTour.
export const youtubeLibraryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    youtubeLibrary: builder.query({
      query: (opts = {}) =>
        `/api/youtube-library${opts?.refresh ? "?refresh=1" : ""}`,
      keepUnusedDataFor: 120,
    }),
  }),
});

export const { useYoutubeLibraryQuery } = youtubeLibraryApiSlice;
