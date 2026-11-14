import { apiSlice } from "./apiSlice";

type ProofState = "pending" | "approved" | "unavailable";
type Receipt = { code: string | number | null; status: ProofState; canApprove: boolean; image: string };
const paymentProofApi = apiSlice.enhanceEndpoints({ addTagTypes: ["TournamentPaymentProof"] }).injectEndpoints({
  endpoints: (builder) => ({
    submitTournamentPaymentProof: builder.mutation<{ status: ProofState }, { id: string; body: FormData }>({
      query: ({ id, body }) => ({ url: `/api/registrations/${id}/payment-proof`, method: "POST", body }),
    }),
    getTournamentPaymentProof: builder.query<Receipt, string>({
      query: (id) => `/api/registrations/payment-proofs/${id}`,
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, id) => [{ type: "TournamentPaymentProof", id }],
    }),
    approveTournamentPaymentProof: builder.mutation<{ status: ProofState }, string>({
      query: (id) => ({ url: `/api/registrations/payment-proofs/${id}/approve`, method: "POST" }),
      invalidatesTags: (result, _error, id) => result ? [{ type: "TournamentPaymentProof", id }, "Registrations"] : [],
    }),
  }),
});

export const { useSubmitTournamentPaymentProofMutation, useGetTournamentPaymentProofQuery, useApproveTournamentPaymentProofMutation } = paymentProofApi;
