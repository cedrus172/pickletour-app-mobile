import { apiSlice } from "./apiSlice";

// Highlight & VAR — phân tích video trận (backend /api/var giữ khoá máy phân tích).
export const varApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureFlags: builder.query({
      query: () => "/api/app/init/features",
      transformResponse: (r) => r?.features || {},
      providesTags: ["FeatureFlags"],
      keepUnusedDataFor: 300,
    }),
    getMyPcoin: builder.query({
      query: () => "/api/pcoin/me",
      providesTags: ["Pcoin"],
    }),
    listVarJobs: builder.query({
      query: (tab) => `/api/var/jobs${tab ? `?tab=${tab}` : ""}`,
      providesTags: ["VarJob"],
    }),
    getVarJob: builder.query({
      query: (id) => `/api/var/jobs/${id}`,
      providesTags: (r, e, id) => [{ type: "VarJob", id }],
    }),
    uploadVarVideo: builder.mutation({
      // file = { uri, name, type }
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return { url: "/api/var/uploads", method: "POST", body, timeout: 30 * 60 * 1000 };
      },
    }),
    createVarJob: builder.mutation({
      query: (body) => ({ url: "/api/var/jobs", method: "POST", body }),
      invalidatesTags: ["VarJob", "Pcoin"],
    }),
    cancelVarJob: builder.mutation({
      query: (id) => ({ url: `/api/var/jobs/${id}/cancel`, method: "POST" }),
      invalidatesTags: ["VarJob", "Pcoin"],
    }),
    deleteVarJob: builder.mutation({
      query: (id) => ({ url: `/api/var/jobs/${id}`, method: "DELETE" }),
      invalidatesTags: ["VarJob"],
    }),
    rebuildVarHighlight: builder.mutation({
      query: (id) => ({ url: `/api/var/jobs/${id}/highlight`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "VarJob", id }],
    }),
    checkVarRally: builder.mutation({
      query: ({ id, index }) => ({ url: `/api/var/jobs/${id}/rallies/${index}/check`, method: "POST", timeout: 200000 }),
      invalidatesTags: (r, e, { id }) => [{ type: "VarJob", id }],
    }),
    editVarRally: builder.mutation({
      query: ({ id, index, winner }) => ({ url: `/api/var/jobs/${id}/rallies/${index}`, method: "PATCH", body: { winner } }),
      invalidatesTags: (r, e, { id }) => [{ type: "VarJob", id }],
    }),
  }),
});

export const {
  useGetFeatureFlagsQuery,
  useGetMyPcoinQuery,
  useListVarJobsQuery,
  useGetVarJobQuery,
  useUploadVarVideoMutation,
  useCreateVarJobMutation,
  useCancelVarJobMutation,
  useDeleteVarJobMutation,
  useRebuildVarHighlightMutation,
  useCheckVarRallyMutation,
  useEditVarRallyMutation,
} = varApiSlice;
