import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

import { AdminAppearanceProvider } from "./auth/AdminAppearanceContext";
import { StudentAuthProvider } from "./auth/StudentAuthContext";
import { StudentAppearanceProvider } from "./auth/StudentAppearanceContext";

import "./styles.css";
import "./student-card-surfaces.css";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAppearanceProvider>
        <AuthProvider>
        <StudentAuthProvider>
          <StudentAppearanceProvider>
            <App />
          </StudentAppearanceProvider>
        </StudentAuthProvider>
        </AuthProvider>
      </AdminAppearanceProvider>
    </BrowserRouter>
  </StrictMode>
);