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
import { createCustomerSession, checkCustomerExists } from '@/action/portal'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
})

const fullSchema = z.object({
  email: z.string().email('Email inválido'),
  confirmEmail: z.string().email('Email inválido'),
  name: z.string().min(1, 'El nombre es obligatorio'),
}).refine((data) => data.email === data.confirmEmail, {
  message: 'Los correos no coinciden',
  path: ['confirmEmail'],
})

type EmailFormData = z.infer<typeof emailSchema>
type FullFormData = z.infer<typeof fullSchema>

interface LoginFormProps {
  companyId: string
}

export function LoginForm({ companyId }: LoginFormProps) {
  const router = useRouter()
  const { saveSession } = useChatSession()
  const [loading, setLoading] = useState(false)
  const [showNameField, setShowNameField] = useState(false)
  const [emailValue, setEmailValue] = useState('')

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema)
  })

  const fullForm = useForm<FullFormData>({
    resolver: zodResolver(fullSchema)
  })

  const handleEmailSubmit = async (data: EmailFormData) => {
    try {
      setLoading(true)
      setEmailValue(data.email)

      // Verificar si el cliente existe
      const checkResult = await checkCustomerExists(companyId, data.email)

      if (checkResult.exists) {
        // Cliente existe, crear sesión directamente
        const result = await createCustomerSession(companyId, data.email)

        if (result.success && result.token && result.sessionData) {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

          saveSession(result.token, {
            customerId: result.sessionData.customerId,
            email: result.sessionData.email,
            name: result.sessionData.name,
            companyId: companyId,
            expiresAt: expiresAt.toISOString()
          })

          toast.success('¡Bienvenido!', {
            description: 'Has iniciado sesión correctamente'
          })

          setTimeout(() => {
            router.push(`/portal/${companyId}/reservation`)
            router.refresh()
          }, 100)
        } else {
          toast.error('Error', {
            description: result.error || 'No se pudo iniciar sesión'
          })
        }
      } else {
        // Cliente no existe, mostrar campo de nombre
        setShowNameField(true)
        // No pre-llenar el email, el usuario debe escribirlo de nuevo por seguridad
      }
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Ocurrió un error inesperado'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFullSubmit = async (data: FullFormData) => {
    try {
      setLoading(true)
      const result = await createCustomerSession(companyId, data.email, data.name)

      if (result.success && result.token && result.sessionData) {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        saveSession(result.token, {
          customerId: result.sessionData.customerId,
          email: result.sessionData.email,
          name: result.sessionData.name,
          companyId: companyId,
          expiresAt: expiresAt.toISOString()
        })

        toast.success('¡Bienvenido!', {
          description: 'Tu cuenta ha sido creada correctamente'
        })

        setTimeout(() => {
          router.push(`/portal/${companyId}/reservation`)
          router.refresh()
        }, 100)
      } else {
        toast.error('Error', {
          description: result.error || 'No se pudo crear la cuenta'
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

  if (showNameField) {
    return (
      <form onSubmit={fullForm.handleSubmit(handleFullSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            {...fullForm.register('email')}
            className="mt-1"
            autoFocus
          />
          {fullForm.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">{fullForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmEmail">Confirmar Email *</Label>
          <Input
            id="confirmEmail"
            type="email"
            placeholder="confirma tu correo"
            {...fullForm.register('confirmEmail')}
            className="mt-1"
          />
          {fullForm.formState.errors.confirmEmail && (
            <p className="text-sm text-red-600 mt-1">{fullForm.formState.errors.confirmEmail.message}</p>
          )}
          <p className="text-xs text-ironside mt-2">
            Por seguridad, confirma tu correo electrónico.
          </p>
        </div>

        <div>
          <Label htmlFor="name">Nombre Completo *</Label>
          <Input
            id="name"
            type="text"
            placeholder="Tu nombre completo"
            {...fullForm.register('name')}
            className="mt-1"
          />
          {fullForm.formState.errors.name && (
            <p className="text-sm text-red-600 mt-1">{fullForm.formState.errors.name.message}</p>
          )}
          <p className="text-xs text-ironside mt-2">
            Como es tu primera vez, necesitamos tu nombre para crear tu cuenta.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-orange hover:bg-orange/90 text-white"
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Continuar'}
        </Button>

      </form>
    )
  }

  return (
    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          {...emailForm.register('email')}
          className="mt-1"
          autoFocus
        />
        {emailForm.formState.errors.email && (
          <p className="text-sm text-red-600 mt-1">{emailForm.formState.errors.email.message}</p>
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
        {loading ? 'Verificando...' : 'Continuar'}
      </Button>

      <p className="text-xs text-center text-ironside">
        Al continuar, aceptas nuestros términos y condiciones
      </p>
    </form>
  )
}

