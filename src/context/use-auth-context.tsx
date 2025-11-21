"use client";

import React, { useState } from "react";

type AuthContextProviderProps = {
  children: React.ReactNode;
};

type InitialValuesProps = {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  requiresMFA?: boolean;
  setRequiresMFA?: React.Dispatch<React.SetStateAction<boolean>>;
};

const InitialValues: InitialValuesProps = {
  currentStep: 1,
  setCurrentStep: () => undefined,
  requiresMFA: false,
  setRequiresMFA: () => undefined,
};

const authContext = React.createContext(InitialValues);

const { Provider } = authContext;

export const AuthContextProvider = ({ children, requiresMFA: propRequiresMFA = false }: AuthContextProviderProps & { requiresMFA?: boolean }) => {
  const [currentStep, setCurrentStep] = useState<number>(
    InitialValues.currentStep,
  );
  const [requiresMFA, setRequiresMFA] = useState<boolean>(propRequiresMFA);

  // Actualizar requiresMFA cuando el prop cambia
  React.useEffect(() => {
    setRequiresMFA(propRequiresMFA);
  }, [propRequiresMFA]);

  const values = { currentStep, setCurrentStep, requiresMFA, setRequiresMFA };

  return <Provider value={values}>{children}</Provider>;
};

export const useAuthContextHook = () => {
  const state = React.useContext(authContext);

  return state;
};
