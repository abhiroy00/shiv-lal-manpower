import { RouterProvider, createBrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

const router = createBrowserRouter(AppRoutes);

export default function App() {
  return <RouterProvider router={router} />;
}
