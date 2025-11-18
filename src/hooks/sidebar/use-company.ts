"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { AddCompanySchema } from "@/schemas/settings.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadClient } from "@uploadcare/upload-client";
import { usePathname, useRouter } from "next/navigation";
import { FieldValues, useForm } from "react-hook-form";
import { onIntegrateCompany } from "@/action/settings";

const upload = new UploadClient({
    publicKey: process.env.NEXT_PUBLIC_UPLOAD_CARE_PUBLIC_KEY as string,
});

export const useCompany = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FieldValues>({
        resolver: zodResolver(AddCompanySchema),
    });

    const pathname = usePathname();
    const { toast } = useToast();
    const [loading, setLoading] = useState<boolean>(false);
    const [isCompany, setIsCompany] = useState<string | undefined>(undefined);
    const router = useRouter();

    useEffect(() => {
        const lastSegment = pathname?.split("/").pop();
        setIsCompany(lastSegment ? decodeURIComponent(lastSegment) : undefined);
    }, [pathname]);

    const onAddCompany = handleSubmit(async (values: FieldValues) => {
        setLoading(true);
        const uploaded = await upload.uploadFile(values.image[0]);
        const company = await onIntegrateCompany(values.company, uploaded.uuid);
        if (company) {
            reset();
            setLoading(false);
            toast({
                title: company.status === 200 ? 'Success' : 'Error',
                description: company.message,
            })

            if (company.status === 200 && company.companyId) {
                router.push(`/company`);
            } else {
                router.refresh();
            }
        }
    });

    return {
        register,
        onAddCompany,
        errors,
        loading,
        isCompany,
        reset,
    }
};
