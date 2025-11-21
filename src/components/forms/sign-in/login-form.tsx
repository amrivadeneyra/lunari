"use client";

import { USER_LOGIN_FORM } from "@/constants/forms";
import { useFormContext } from "react-hook-form";
import FormGenerator from "../form-generator";
import OTPInput from "@/components/otp";
import { useState, useEffect } from "react";
import { useAuthContextHook } from "@/context/use-auth-context";

type Props = {
  requiresMFA?: boolean;
};

const LoginForm = ({ requiresMFA: propRequiresMFA }: Props) => {
  // Usar el prop si viene, sino usar el contexto
  const context = useAuthContextHook();
  const requiresMFA = propRequiresMFA ?? context.requiresMFA ?? false;
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const [otpCode, setOtpCode] = useState<string>("");
  const code = watch("code");

  useEffect(() => {
    // Limpiar el código: solo números, sin espacios ni guiones
    const cleanedCode = otpCode.replace(/\D/g, '');
    if (cleanedCode !== otpCode) {
      // Si hay caracteres no numéricos, actualizar el estado
      setOtpCode(cleanedCode);
    }

    // Actualizar el formulario con el código limpio
    if (cleanedCode) {
      setValue("code", cleanedCode, { shouldValidate: true });
    } else {
      setValue("code", "", { shouldValidate: false });
    }
  }, [otpCode, setValue]);

  // Limpiar el código cuando requiresMFA cambia a false
  useEffect(() => {
    if (!requiresMFA) {
      setOtpCode("");
      setValue("code", "", { shouldValidate: false });
    }
  }, [requiresMFA, setValue]);

  return (
    <>
      <h2 className="text-gravel md:text-4xl font-bold">
        {requiresMFA ? "Código de autenticación" : "Iniciar sesión"}
      </h2>
      <p className="text-iridium md:text-sm">
        {requiresMFA
          ? "Ingresa el código de autenticación de dos factores que recibiste"
          : "Recibirás una contraseña de un solo uso"}
      </p>

      {requiresMFA ? (
        <>
          <div className="w-full justify-center flex py-5">
            <OTPInput otp={otpCode} setOtp={setOtpCode} />
          </div>
          {errors.code && (
            <p className="text-red-400 mt-2">
              {errors.code.message as string}
            </p>
          )}
        </>
      ) : (
        <>
          {USER_LOGIN_FORM.map((field) => (
            <FormGenerator
              key={field.id}
              {...field}
              errors={errors}
              register={register}
              name={field.name}
            />
          ))}
        </>
      )}
    </>
  );
};

export default LoginForm;
