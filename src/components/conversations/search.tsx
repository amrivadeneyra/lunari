import React, { useEffect } from 'react'
import { FieldValues, UseFormRegister, UseFormSetValue } from 'react-hook-form'

type Props = {
  register: UseFormRegister<FieldValues>
  setValue: UseFormSetValue<FieldValues>
  company?:
  | {
    name: string
    id: string
    icon: string
  }
  | null
  | undefined
}

const ConversationSearch = ({ register, setValue, company }: Props) => {
  // Automáticamente seleccionar la empresa si existe
  useEffect(() => {
    if (company) {
      setValue('company', company.id)
    }
  }, [company, setValue])

  // Si hay una empresa, mostrar su nombre
  if (company) {
    return (
      <div className="flex flex-col py-3">
        <div className="px-3 py-4 text-sm border-[1px] rounded-lg mr-5 bg-gray-50 text-gray-600">
          {company.name}
        </div>
        {/* Campo oculto para mantener el valor */}
        <input type="hidden" {...register('company')} value={company.id} />
      </div>
    )
  }

  // Si no hay empresa, mostrar mensaje
  return (
    <div className="flex flex-col py-3">
      <div className="px-3 py-4 text-sm border-[1px] rounded-lg mr-5 bg-gray-50 text-gray-400">
        No hay empresa configurada
      </div>
    </div>
  )
}

export default ConversationSearch
