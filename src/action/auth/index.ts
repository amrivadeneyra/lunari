"use server";

import { client } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs";
import { onGetAccountCompany } from "../settings";

export const onCompleteUserRegistration = async (
  fullname: string,
  clerkId: string,
  type: string,
) => {
  try {
    const registered = await client.user.create({
      data: {
        fullname,
        clerkId,
        type,
      },
      select: {
        fullname: true,
        id: true,
        type: true,
      },
    });

    if (registered) {
      return { status: 200, user: registered };
    }
  } catch (error: any) {
    return { status: 400 };
  }
};


export const onLoginUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null; // En lugar de redirectToSignIn(), retornamos null
  } else {
    try {
      const authenticated = await client.user.findUnique({
        where: {
          clerkId: user.id,
        },
        select: {
          fullname: true,
          id: true,
          type: true,
        },
      });

      if (authenticated) {
        const companyData = await onGetAccountCompany();

        return { status: 200, user: authenticated, company: companyData?.company };
      }
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  }

  return null; // Si no se encuentra el usuario en la base de datos
};
