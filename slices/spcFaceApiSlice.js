import { apiSlice } from "./apiSlice";

// Tra cứu ảnh VĐV (admin): khuôn mặt trong ảnh tải lên → VĐV (tên, SĐT) trong dữ liệu SPC
export const spcFaceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSpcFaceStatus: builder.query({
      query: () => "/api/admin/spc-face/status",
      keepUnusedDataFor: 0,
    }),
    detectSpcFaces: builder.mutation({
      // file = { uri, name, type }
      query: (file) => {
        const body = new FormData();
        body.append("photo", file);
        return { url: "/api/admin/spc-face/detect", method: "POST", body };
      },
    }),
    searchSpcFace: builder.mutation({
      query: (emb) => ({ url: "/api/admin/spc-face/search", method: "POST", body: { emb } }),
    }),
  }),
});

export const { useGetSpcFaceStatusQuery, useDetectSpcFacesMutation, useSearchSpcFaceMutation } = spcFaceApiSlice;
