import { useToast } from "@/components/ui/use-toast";
import { UserLoginProps, UserLoginSchema } from "@/schemas/auth.schema";
import { useSignIn } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export const useSignInForm = () => {
  const { isLoaded, setActive, signIn } = useSignIn();
  const [loading, setLoading] = useState<boolean>(false);
  const [requiresMFA, setRequiresMFA] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();
  const methods = useForm<UserLoginProps>({
    resolver: zodResolver(UserLoginSchema),
    mode: "onChange",
  });

  const onHandleSubmit = methods.handleSubmit(
    async (values: UserLoginProps) => {
      if (!isLoaded) return;

      try {
        setLoading(true);

        // Si ya tenemos email y password, y ahora viene el código MFA
        if (requiresMFA && values.code) {
          // Limpiar el código: solo números, sin espacios ni guiones
          const cleanedCode = values.code.replace(/\D/g, '');

          // Validar que el código tenga 6 dígitos
          if (cleanedCode.length !== 6) {
            toast({
              title: "Error",
              description: "El código debe tener 6 dígitos",
            });
            setLoading(false);
            return;
          }

          // Intentar primero como segundo factor (más común cuando viene después de password)
          if (signIn.supportedSecondFactors && signIn.supportedSecondFactors.length > 0) {
            const emailCodeFactor = signIn.supportedSecondFactors.find(
              (factor: any) => factor.strategy === "email_code"
            ) as any;

            if (emailCodeFactor) {
              const attemptSecondFactor = await signIn.attemptSecondFactor({
                strategy: "email_code" as any,
                code: cleanedCode,
              });

              if (attemptSecondFactor.status === "complete") {
                await setActive({ session: attemptSecondFactor.createdSessionId });

                toast({
                  title: "Éxito",
                  description: "Bienvenido de nuevo!",
                });

                router.push("/dashboard");
                setRequiresMFA(false);
                setLoading(false);
                return;
              }

              // Si el segundo factor falló pero no está completo, podría necesitar más intentos
              if (attemptSecondFactor.status === "needs_second_factor") {
                toast({
                  title: "Error",
                  description: "El código de autenticación es incorrecto. Por favor intenta nuevamente.",
                });
                setLoading(false);
                return;
              }
            }
          }

          // Si no funciona como segundo factor, intentar como primer factor
          const supportedFirstFactors = signIn.supportedFirstFactors;
          const emailCodeFactor = supportedFirstFactors.find(
            (factor) => factor.strategy === "email_code"
          );

          if (emailCodeFactor) {
            const attemptFirstFactor = await signIn.attemptFirstFactor({
              strategy: "email_code",
              code: cleanedCode,
            });

            if (attemptFirstFactor.status === "complete") {
              await setActive({ session: attemptFirstFactor.createdSessionId });

              toast({
                title: "Éxito",
                description: "Bienvenido de nuevo!",
              });

              router.push("/dashboard");
              setRequiresMFA(false);
              return;
            }

            if (attemptFirstFactor.status === "needs_second_factor") {
              setRequiresMFA(true);
              const supportedSecondFactors = signIn.supportedSecondFactors;
              const secondEmailCodeFactor = supportedSecondFactors?.find(
                (factor: any) => factor.strategy === "email_code"
              ) as any;

              if (secondEmailCodeFactor) {
                await signIn.prepareSecondFactor({
                  strategy: "email_code" as any,
                } as any);

                toast({
                  title: "Código de verificación requerido",
                  description: "Por favor ingresa el código de autenticación que se envió a tu email",
                });
              }
              setLoading(false);
              return;
            }
          }

          // Si no funciona, mostrar error
          toast({
            title: "Error",
            description: "El código de autenticación es incorrecto. Verifica que ingresaste el código correcto que recibiste en tu email.",
          });
          setLoading(false);
          return;
        }

        // Primera autenticación con email y password
        const authenticated = await signIn.create({
          identifier: values.email,
          password: values.password,
        });

        // 🔍 DEBUG: Log para ver qué está pidiendo Clerk
        console.log("🔍 Estado de autenticación Clerk:", authenticated.status);
        console.log("🔍 Factores soportados:", signIn.supportedFirstFactors);
        console.log("🔍 Información completa:", authenticated);

        // Si requiere MFA (autenticación de doble factor)
        if (authenticated.status === "needs_first_factor") {
          setRequiresMFA(true);

          // Obtener el factor disponible (preferir email_code)
          const supportedFirstFactors = signIn.supportedFirstFactors;
          const emailCodeFactor = supportedFirstFactors.find(
            (factor) => factor.strategy === "email_code"
          );

          if (emailCodeFactor) {
            // Preparar el primer factor con email_code
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailCodeFactor.emailAddressId,
            });
          } else {
            // Si no hay email_code, intentar con phone_code
            const phoneCodeFactor = supportedFirstFactors.find(
              (factor) => factor.strategy === "phone_code"
            );

            if (!phoneCodeFactor) {
              toast({
                title: "Error",
                description: "No se encontró un método de autenticación disponible",
              });
              setLoading(false);
              return;
            }

            // Para phone_code necesitamos el phoneNumberId
            await signIn.prepareFirstFactor({
              strategy: "phone_code",
              phoneNumberId: phoneCodeFactor.phoneNumberId,
            });
          }

          toast({
            title: "Código requerido",
            description: "Por favor ingresa el código de autenticación de dos factores",
          });
          setLoading(false);
          return;
        }

        // Si requiere segundo factor (MFA después de email/password)
        if (authenticated.status === "needs_second_factor") {
          setRequiresMFA(true);

          // Obtener el segundo factor disponible (preferir email_code)
          const supportedSecondFactors = signIn.supportedSecondFactors;
          const emailCodeFactor = supportedSecondFactors.find(
            (factor: any) => factor.strategy === "email_code"
          ) as any;

          if (emailCodeFactor) {
            // Preparar el segundo factor con email_code
            await signIn.prepareSecondFactor({
              strategy: "email_code" as any,
            } as any);

            toast({
              title: "Código de verificación requerido",
              description: "Por favor ingresa el código de autenticación que se envió a tu email",
            });
          } else {
            toast({
              title: "Error",
              description: "No se encontró un método de autenticación disponible para el segundo factor",
            });
          }
          setLoading(false);
          return;
        }

        // Si la autenticación está completa
        if (authenticated.status === "complete") {
          await setActive({ session: authenticated.createdSessionId });

          toast({
            title: "Éxito",
            description: "Bienvenido de nuevo!",
          });

          router.push("/dashboard");
          setRequiresMFA(false);
        }
      } catch (error: any) {
        setLoading(false);

        if (error.errors?.[0]?.code === "form_password_incorrect") {
          toast({
            title: "Error",
            description: "email/password es incorrecto, intenta nuevamente",
          });
          setRequiresMFA(false);
        } else if (error.errors?.[0]?.code === "form_code_incorrect") {
          toast({
            title: "Código incorrecto",
            description: "El código de autenticación es incorrecto. Verifica que ingresaste el código correcto que recibiste en tu email. Si el código expiró, puedes intentar iniciar sesión nuevamente para recibir uno nuevo.",
          });
          // No resetear requiresMFA aquí para que pueda intentar nuevamente
        } else {
          toast({
            title: "Error",
            description: error.errors?.[0]?.longMessage || "Ocurrió un error al iniciar sesión",
          });
          // Solo resetear requiresMFA si es un error diferente
          if (error.errors?.[0]?.code !== "form_code_incorrect") {
            setRequiresMFA(false);
          }
        }
      }
    },
  );

  return {
    methods,
    onHandleSubmit,
    loading,
    requiresMFA,
  };
};
