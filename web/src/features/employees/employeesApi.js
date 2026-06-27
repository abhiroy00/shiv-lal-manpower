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
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useResetEmployeePasswordMutation,
  useGetEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useDeleteEmployeeDocumentMutation,
} = employeesApi;
