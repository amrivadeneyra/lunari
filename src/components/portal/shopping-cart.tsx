'use client'

import React, { useState } from 'react'
import { useCart } from '@/context/portal/cart-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, ShoppingCart as ShoppingCartIcon, Plus, Minus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { createMultipleReservations } from '@/action/portal'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'

interface ShoppingCartProps {
  isOpen: boolean
  onClose: () => void
}

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const { items, updateQuantity, removeItem, clearCart, getTotal, getItemCount } = useCart()
  const { sessionData } = useChatSession()
  const router = useRouter()
  const params = useParams()
  const [isCreating, setIsCreating] = useState(false)

  // Obtener companyId de la URL
  const companyId = params?.companyid as string

  const handleCreateReservations = async () => {
    if (!sessionData?.customerId) {
      toast.error('Debes iniciar sesión para crear reservas')
      // TODO: Abrir chatbot o mostrar modal de login
      return
    }

    if (items.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    setIsCreating(true)

    try {
      const result = await createMultipleReservations(
        items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          details: {
            unit: item.unit,
            width: item.width,
            weight: item.weight,
            color: item.color,
          }
        })),
        sessionData.customerId
      )

      console.log('✅ Resultado:', result)

      if (result.success) {
        toast.success(`${items.length} reserva(s) creada(s) exitosamente`)
        clearCart()
        onClose()
        // Redirigir a reservas (ruta en inglés)
        router.push(`/portal/${companyId}/reservation`)
      } else {
        toast.error(result.error || 'Error al crear las reservas')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear las reservas')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Panel del carrito */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange/20 bg-peach/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center">
              <ShoppingCartIcon className="w-5 h-5 text-orange" />
            </div>
            <h2 className="text-lg font-semibold text-gravel">
              Carrito ({getItemCount()})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-peach rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gravel" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCartIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Tu carrito está vacío</p>
              <p className="text-gray-400 text-sm">
                Agrega productos desde el catálogo o el chatbot
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 p-4 border rounded-lg"
                >
                  {/* Imagen */}
                  <div className="relative w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                    <Image
                      src={`https://ucarecdn.com/${item.product.image}/`}
                      alt={item.product.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      S/ {item.unitPrice} {item.unit && `/ ${item.unit}`}
                    </p>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1
                          updateQuantity(item.productId, qty)
                        }}
                        className="w-16 text-center"
                        min={1}
                      />
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Total y eliminar */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 hover:bg-red-50 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="font-semibold text-sm">
                      S/ {item.totalPrice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gravel">Total:</span>
              <span className="text-xl font-bold text-orange">
                S/ {getTotal()}
              </span>
            </div>
            <Button
              onClick={handleCreateReservations}
              disabled={isCreating || !sessionData?.customerId}
              className="w-full bg-orange hover:bg-orange/90 text-white"
            >
              {isCreating ? 'Creando reservas...' : 'Crear Reservas'}
            </Button>
            {!sessionData?.customerId && (
              <p className="text-xs text-gray-500 text-center">
                Inicia sesión en el chatbot para crear reservas
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

