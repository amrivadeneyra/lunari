'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createCustomerSession } from '@/action/portal'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  companyId: string
}

export function LoginForm({ companyId }: LoginFormProps) {
  const router = useRouter()
  const { saveSession } = useChatSession()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      const result = await createCustomerSession(companyId, data.email)

      if (result.success && result.token && result.sessionData) {
        // Calcular expiresAt (30 días desde ahora)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        // Guardar sesión usando el hook para actualizar el estado
        saveSession(result.token, {
          customerId: result.sessionData.customerId,
          email: result.sessionData.email,
          name: result.sessionData.name,
          expiresAt: expiresAt.toISOString()
        })

        toast.success('¡Bienvenido!', {
          description: 'Has iniciado sesión correctamente'
        })

        // Pequeño delay para asegurar que la sesión se guarde
        setTimeout(() => {
          router.push(`/portal/${companyId}/reservation`)
          router.refresh()
        }, 100)
      } else {
        toast.error('Error', {
          description: result.error || 'No se pudo iniciar sesión'
        })
      }
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Ocurrió un error inesperado'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          {...register('email')}
          className="mt-1"
          autoFocus
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
        <p className="text-xs text-ironside mt-2">
          Ingresa tu email para acceder. Si es tu primera vez, crearemos tu cuenta automáticamente.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-orange hover:bg-orange/90 text-white"
        disabled={loading}
      >
        {loading ? 'Accediendo...' : 'Continuar'}
      </Button>

      <p className="text-xs text-center text-ironside">
        Al continuar, aceptas nuestros términos y condiciones
      </p>
    </form>
  )
}

