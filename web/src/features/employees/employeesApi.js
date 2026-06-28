import { baseApi } from "../../api/baseApi";

export const employeesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEmployees: build.query({
      query: (params) => ({ url: "/employees/", params }),
      providesTags: ["Employee"],
    }),
    getEmployee: build.query({
      query: (id) => `/employees/${id}/`,
      providesTags: (r, e, id) => [{ type: "Employee", id }],
    }),
    createEmployee: build.mutation({
      query: (body) => ({ url: "/employees/", method: "POST", body }),
      invalidatesTags: ["Employee"],
    }),
    updateEmployee: build.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}/`, method: "PATCH", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Employee", id }, "Employee"],
    }),
    deleteEmployee: build.mutation({
      query: (id) => ({ url: `/employees/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Employee"],
    }),
    resetEmployeePassword: build.mutation({
      query: (id) => ({ url: `/employees/${id}/reset-password/`, method: "POST" }),
    }),
    createEmployeeLogin: build.mutation({
      query: (id) => ({ url: `/employees/${id}/create-login/`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "Employee", id }, "Employee"],
    }),
    getEmployeeDocuments: build.query({
      query: (id) => `/employees/${id}/documents/`,
      providesTags: (r, e, id) => [{ type: "Employee", id: `${id}-docs` }],
    }),
    uploadEmployeeDocument: build.mutation({
      query: ({ id, formData }) => ({
        url: `/employees/${id}/documents/`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (r, e, { id }) => [{ type: "Employee", id: `${id}-docs` }],
    }),
    deleteEmployeeDocument: build.mutation({
      query: ({ empId, docId }) => ({
        url: `/employees/${empId}/documents/${docId}/`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, { empId }) => [{ type: "Employee", id: `${empId}-docs` }],
    }),
    importEmployees: build.mutation({
      query: (formData) => ({ url: "/employees/import/", method: "POST", body: formData }),
      invalidatesTags: ["Employee"],
    }),
    getMyDocuments: build.query({
      query: () => "/employees/my-documents/",
      providesTags: ["MyDocuments"],
    }),
    uploadMyDocument: build.mutation({
      query: (formData) => ({ url: "/employees/my-documents/", method: "POST", body: formData }),
      invalidatesTags: ["MyDocuments"],
    }),
    deleteMyDocument: build.mutation({
      query: (docId) => ({ url: `/employees/my-documents/${docId}/`, method: "DELETE" }),
      invalidatesTags: ["MyDocuments"],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useResetEmployeePasswordMutation,
  useCreateEmployeeLoginMutation,
  useGetEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useDeleteEmployeeDocumentMutation,
  useImportEmployeesMutation,
  useGetMyDocumentsQuery,
  useUploadMyDocumentMutation,
  useDeleteMyDocumentMutation,
} = employeesApi;
