import { apiSlice } from "./apiSlice";

export const tournamentRuleFilesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTournamentRuleFiles: builder.query({
      query: (id) => "/api/tournaments/" + id + "/rule-files",
      providesTags: (_result, _error, id) => [{ type: "Tournaments", id: "RULE_FILES:" + id }],
      extraOptions: { skip404Redirect: true },
    }),
    uploadTournamentRuleFile: builder.mutation({
      query: ({ tournamentId, file }) => {
        const body = new FormData();
        body.append("file", file?.uri
          ? { uri: file.uri, name: file.name, type: file.type }
          : file);
        return { url: "/api/tournaments/" + tournamentId + "/rule-files", method: "POST", body };
      },
      invalidatesTags: (_result, _error, { tournamentId }) => [{ type: "Tournaments", id: "RULE_FILES:" + tournamentId }],
      extraOptions: { skip404Redirect: true },
    }),
    deleteTournamentRuleFile: builder.mutation({
      query: ({ tournamentId, fileId }) => ({
        url: "/api/tournaments/" + tournamentId + "/rule-files/" + fileId, method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { tournamentId }) => [{ type: "Tournaments", id: "RULE_FILES:" + tournamentId }],
      extraOptions: { skip404Redirect: true },
    }),
  }),
});

export const {
  useGetTournamentRuleFilesQuery,
  useUploadTournamentRuleFileMutation,
  useDeleteTournamentRuleFileMutation,
} = tournamentRuleFilesApiSlice;

