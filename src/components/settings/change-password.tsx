'use client'
import { useChangePassword } from '@/hooks/settings/use-settings'
import React from 'react'
import FormGenerator from '../forms/form-generator'
import { Button } from '../ui/button'
import { Loader } from '../loader'
import { Section } from '../section-label'

type Props = {}

const ChangePassword = (props: Props) => {
  const { register, errors, onChangePassword, loading } = useChangePassword()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-1">
        <Section
          label="Cambiar Contraseña"
          message="Restablece tu contraseña"
        />
      </div>
      <form
        onSubmit={onChangePassword}
        className="lg:col-span-4"
      >
        <div className="lg:w-[500px] flex flex-col gap-3">
          <FormGenerator
            register={register}
            errors={errors}
            name="password"
            placeholder="Nueva Contraseña"
            type="text"
            inputType="input"
          />
          <FormGenerator
            register={register}
            errors={errors}
            name="confirmPassword"
            placeholder="Confirmar Contraseña"
            type="text"
            inputType="input"
          />
          <Button className="bg-grandis text-gray-700 font-semibold">
            <Loader loading={loading}>Cambiar Contraseña</Loader>
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ChangePassword
