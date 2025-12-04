'use client'
import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Loader } from '../loader'
import { Section } from '../section-label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { onDeleteAccount } from '@/action/settings'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, AlertTriangle } from 'lucide-react'

type Props = {}

const DeleteAccount = (props: Props) => {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      const result = await onDeleteAccount()

      if (result?.status === 200) {
        toast({
          title: 'Cuenta eliminada',
          description: result.message || 'Tu cuenta y todos los datos asociados han sido eliminados exitosamente.',
        })
        setTimeout(() => {
          router.push('/auth/select')
        }, 2000)
      } else {
        toast({
          title: 'Error',
          description: result?.message || 'No se pudo eliminar la cuenta. Por favor, intenta nuevamente.',
          variant: 'destructive',
        })
        setOpen(false)
      }
    } catch (error) {
      console.error('Error al eliminar cuenta:', error)
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
        variant: 'destructive',
      })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-1">
        <Section
          label="Eliminar Cuenta"
          message="Esta acción no se puede deshacer"
        />
      </div>
      <div className="lg:col-span-4">
        <div className="lg:w-[500px]">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium mb-1">
                  Advertencia: Esta acción es permanente
                </p>
                <p className="text-sm text-red-700">
                  Al eliminar tu cuenta, se eliminarán permanentemente todos tus datos, incluyendo:
                  productos, clientes, conversaciones, citas, configuraciones y cualquier otra información asociada a tu empresa.
                </p>
              </div>
            </div>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Cuenta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  ¿Estás completamente seguro?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 pt-2">
                  <p>
                    Esta acción eliminará permanentemente tu cuenta y <strong>todos</strong> los datos asociados, incluyendo:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Tu empresa y su configuración</li>
                    <li>Todos los productos y catálogos</li>
                    <li>Todos los clientes y sus datos</li>
                    <li>Todas las conversaciones y mensajes</li>
                    <li>Todas las citas y reservas</li>
                    <li>Configuraciones del chatbot</li>
                    <li>Métricas y estadísticas</li>
                  </ul>
                  <p className="font-semibold text-red-600 mt-3">
                    Esta acción NO se puede deshacer.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Loader loading={loading}>
                    Eliminar Permanentemente
                  </Loader>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccount

