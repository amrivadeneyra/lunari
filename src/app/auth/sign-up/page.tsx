'use client'

import ButtonHandler from "@/components/forms/sign-up/button-handlers";
import SignUpFormProvider from "@/components/forms/sign-up/form-provider";
import HighlightBar from "@/components/forms/sign-up/highlight-bar";
import RegistrationFormStep from "@/components/forms/sign-up/registration-step";
import React from "react";
import { ClientRouteGuard } from "@/components/guards/client-route-guard";

const SignUp = () => {
  return (
    <ClientRouteGuard>
      <div className="flex-1 py-36 md:px-16 w-full">
        <div className="flex flex-col h-full gap-3">
          <SignUpFormProvider>
            <div className="flex flex-col gap-3">
              <RegistrationFormStep />
              <ButtonHandler />
            </div>
            <HighlightBar />
          </SignUpFormProvider>
        </div>
      </div>
    </ClientRouteGuard>
  );
};

export default SignUp;
