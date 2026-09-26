// Test-only bundle, never exposed as an application route.
import React from "react";
import { createRoot } from "react-dom/client";
import { Navbar } from "../components/ui/navbar";
import { AuthForm } from "../components/auth-form";
import { ConfirmSignIn } from "../components/confirm-sign-in";
createRoot(document.getElementById("root")!).render(
  location.pathname.endsWith("navbar") ? <Navbar /> : location.pathname.endsWith("confirm") ? (
    <ConfirmSignIn />
  ) : (
    <AuthForm next="/create" callbackError={false} />
  ),
);
