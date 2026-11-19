// slices/organizeApiSlice.js — "Tổ chức giải đấu": gửi yêu cầu cho admin + yêu cầu của tôi.
import { apiSlice } from "./apiSlice";

export const organizeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrganizeRequest: builder.mutation({
      query: (body) => ({ url: "/api/organize-requests", method: "POST", body }),
      invalidatesTags: ["OrganizeRequest"],
    }),
    getMyOrganizeRequests: builder.query({
      query: () => "/api/organize-requests/mine",
      providesTags: ["OrganizeRequest"],
    }),
  }),
});

export const { useCreateOrganizeRequestMutation, useGetMyOrganizeRequestsQuery } = organizeApiSlice;
