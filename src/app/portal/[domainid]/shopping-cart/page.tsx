'use client'

import React, { useState } from 'react'
import { useCart } from '@/context/portal/cart-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart as ShoppingCartIcon, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ShoppingCartPage() {
    const { items, updateQuantity, removeItem, clearCart, getTotal, getItemCount } = useCart()
    const { sessionData } = useChatSession()
    const router = useRouter()
    const params = useParams()
    const domainId = params.domainid as string
    const [isCreating, setIsCreating] = useState(false)

    const handleCreateReservations = () => {
        if (!sessionData?.customerId) {
            toast.error('Debes iniciar sesión para crear reservas')
            router.push(`/portal/${domainId}/login`)
            return
        }

        if (items.length === 0) {
            toast.error('El carrito está vacío')
            return
        }

        // Guardar los items del carrito en localStorage para recuperarlos después de crear la cita
        localStorage.setItem('lunari_pending_cart_items', JSON.stringify(items))

        // Redirigir a la página de appointment para que el usuario seleccione la fecha
        router.push(`/portal/${domainId}/appointment/${sessionData.customerId}?fromCart=true`)
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`/portal/${domainId}`}
                    className="inline-flex items-center gap-2 text-gravel hover:text-orange transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Volver al catálogo</span>
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-orange/10 rounded-xl flex items-center justify-center">
                        <ShoppingCartIcon className="w-5 h-5 text-orange" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gravel">Mi Carrito</h1>
                        <p className="text-sm text-ironside">
                            {getItemCount()} {getItemCount() === 1 ? 'producto' : 'productos'} en tu carrito
                        </p>
                    </div>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-orange/20 via-orange/40 to-orange/20 mt-4"></div>
            </div>

            {/* Contenido */}
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-peach rounded-full flex items-center justify-center mb-6">
                        <ShoppingCartIcon className="w-12 h-12 text-orange/50" />
                    </div>
                    <h2 className="text-xl font-semibold text-gravel mb-2">Tu carrito está vacío</h2>
                    <p className="text-ironside mb-6 max-w-md">
                        Agrega productos desde el catálogo o el chatbot para comenzar a hacer reservas
                    </p>
                    <Link href={`/portal/${domainId}`}>
                        <Button className="bg-orange hover:bg-orange/90 text-white">
                            Explorar Productos
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista de productos */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.productId}
                                className="bg-white border border-orange/20 rounded-xl p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex gap-4">
                                    {/* Imagen */}
                                    <div className="relative w-24 h-24 bg-peach rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                            src={`https://ucarecdn.com/${item.product.image}/`}
                                            alt={item.product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base text-gravel mb-1 line-clamp-2">
                                            {item.product.name}
                                        </h3>
                                        <p className="text-sm text-ironside mb-3">
                                            S/ {item.unitPrice} {item.unit && `/ ${item.unit}`}
                                        </p>

                                        {/* Cantidad */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-ironside font-medium">Cantidad:</span>
                                            <div className="flex items-center gap-2 border border-orange/20 rounded-lg">
                                                <button
                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                    className="p-2 hover:bg-peach transition-colors rounded-l-lg"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus className="w-4 h-4 text-gravel" />
                                                </button>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const qty = parseInt(e.target.value) || 1
                                                        updateQuantity(item.productId, qty)
                                                    }}
                                                    className="w-16 text-center border-0 focus-visible:ring-0"
                                                    min={1}
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    className="p-2 hover:bg-peach transition-colors rounded-r-lg"
                                                >
                                                    <Plus className="w-4 h-4 text-gravel" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total y eliminar */}
                                    <div className="flex flex-col items-end justify-between">
                                        <button
                                            onClick={() => removeItem(item.productId)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 mb-2"
                                            aria-label="Eliminar producto"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <div className="text-right">
                                            <p className="text-xs text-ironside mb-1">Subtotal</p>
                                            <p className="text-xl font-bold text-gravel">
                                                S/ {item.totalPrice}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-orange/20 rounded-xl p-6 sticky top-20">
                            <h2 className="text-lg font-semibold text-gravel mb-4">Resumen</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-ironside">Productos ({getItemCount()})</span>
                                    <span className="text-gravel font-medium">S/ {getTotal()}</span>
                                </div>
                                <div className="border-t border-orange/20 pt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gravel">Total:</span>
                                        <span className="text-2xl font-bold text-orange">
                                            S/ {getTotal()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleCreateReservations}
                                disabled={isCreating || !sessionData?.customerId}
                                className="w-full bg-orange hover:bg-orange/90 text-white h-12 text-base font-medium"
                            >
                                {isCreating ? 'Creando reservas...' : 'Crear Reservas'}
                            </Button>

                            {!sessionData?.customerId && (
                                <div className="mt-4 p-3 bg-peach/50 rounded-lg">
                                    <p className="text-xs text-gravel text-center mb-2">
                                        Inicia sesión para crear reservas
                                    </p>
                                    <Link href={`/portal/${domainId}/login`}>
                                        <Button
                                            variant="outline"
                                            className="w-full border-orange text-orange hover:bg-peach"
                                        >
                                            Iniciar Sesión
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            <Link href={`/portal/${domainId}`}>
                                <Button
                                    variant="outline"
                                    className="w-full mt-3 border-orange/30 text-gravel hover:bg-peach"
                                >
                                    Continuar Comprando
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

