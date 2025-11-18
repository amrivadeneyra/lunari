import { useCompany } from "@/hooks/sidebar/use-company";
import { cn } from "@/lib/utils";
import AppDrawer from "../drawer";
import { Loader } from "../loader";
import FormGenerator from "../forms/form-generator";
import UploadButton from "../upload-button";
import { Button } from "../ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
    min?: boolean;
    company: {
        id: string;
        name: string;
        icon: string | null;
    } | null | undefined;
};

const CompanyMenu = ({ company, min }: Props) => {
    const { register, onAddCompany, loading, errors, isCompany, reset } = useCompany()
    const [drawerOpen, setDrawerOpen] = useState(false)

    return (
        <div className={cn('flex flex-col gap-3 w-full', min ? 'mt-6' : 'mt-3')}>
            <div className="flex justify-between w-full items-center">
                {!min && <p className="text-xs text-gray-500">EMPRESA</p>}
                {!company && (
                    <AppDrawer
                        description="Añade tu empresa para integrar tu asistente virtual"
                        title="Añade tu empresa"
                        open={drawerOpen}
                        onOpenChange={(open) => {
                            setDrawerOpen(open)
                            if (!open) {
                                reset()
                            }
                        }}
                        onOpen={
                            <div className="cursor-pointer text-gray-500 rounded-full border-2 w-9 h-9 flex items-center justify-center ml-auto">
                                <Plus />
                            </div>
                        }>
                        <Loader loading={loading}>
                            <form
                                className="mt-3 w-6/12 flex flex-col gap-3"
                                onSubmit={async (e) => {
                                    await onAddCompany(e)
                                    setDrawerOpen(false)
                                }}>
                                <FormGenerator
                                    inputType="input"
                                    register={register}
                                    label="Nombre de la empresa"
                                    name="company"
                                    errors={errors}
                                    placeholder="Mi Empresa"
                                    type="text"
                                />
                                <UploadButton
                                    register={register}
                                    label="Subir Icono"
                                    errors={errors}
                                />
                                <Button
                                    type="submit"
                                    className="w-full">
                                    Añadir Empresa
                                </Button>
                            </form>
                        </Loader>
                    </AppDrawer>
                )}
            </div>
            {company && (
                <div className="flex flex-col gap-1 text-ironside font-medium">
                    <Link
                        href={`/settings/${company.id}`}
                        className={cn(
                            'flex gap-3 items-center justify-center hover:bg-white rounded-lg transition duration-100 ease-in-out cursor-pointer',
                            !min ? 'p-2' : 'py-2',
                            company.name == isCompany && 'bg-white'
                        )}>
                        {company.icon && (
                            <Image
                                src={`https://ucarecdn.com/${company.icon}/`}
                                alt="logo"
                                width={20}
                                height={20}
                                style={{ objectFit: 'contain' }}
                            />
                        )}
                        {!min && <p className="text-sm">{company.name}</p>}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default CompanyMenu;