'use client'

import SignInFormProvider from "@/components/forms/sign-in/form-provider";
import LoginForm from "@/components/forms/sign-in/login-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { ClientRouteGuard } from "@/components/guards/client-route-guard";

const SignInPage = () => {
  return (
    <ClientRouteGuard>
      <div className="flex-1 py-36 md:px-16 w-full">
        <div className="flex flex-col h-full gap-3">
          <SignInFormProvider>
            <div className="flex flex-col gap-3 items-center">
              <LoginForm />
              <Button type="submit" className="w-full">
                Enviar
              </Button>
              <p>
                Aun no tienes una cuenta?{" "}
                <Link href="/auth/sign-up" className="font-bold">
                  Crear Uno
                </Link>
              </p>
            </div>
          </SignInFormProvider>
        </div>
      </div>
    </ClientRouteGuard>
  );
};

export default SignInPage;
