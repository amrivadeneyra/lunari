'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Phone, Calendar, ArrowLeft, LogOut, ShoppingBag, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { updateCustomerProfile } from '@/action/portal'

export default function ProfilePage() {
    const params = useParams()
    const router = useRouter()
    const companyId = params.companyid as string
    const { sessionData, isAuthenticated, clearSession, saveSession, token } = useChatSession()
    const hasRedirected = useRef(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        // Solo redirigir si no está autenticado y no hemos redirigido ya
        if ((!isAuthenticated || !sessionData) && !hasRedirected.current) {
            hasRedirected.current = true
            // Pequeño delay para evitar loops
            const timer = setTimeout(() => {
                router.push(`/portal/${companyId}/login`)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isAuthenticated, sessionData, companyId, router])

    // Inicializar valores cuando se carga la sesión
    useEffect(() => {
        if (sessionData) {
            setName(sessionData.name || '')
            setPhone((sessionData as any).phone || '')
        }
    }, [sessionData])

    // Detectar cambios
    useEffect(() => {
        if (sessionData) {
            const nameChanged = name !== (sessionData.name || '')
            const phoneChanged = phone !== ((sessionData as any).phone || '')
            setHasChanges(nameChanged || phoneChanged)
        }
    }, [name, phone, sessionData])

    const handleSave = async () => {
        if (!sessionData?.customerId) {
            toast.error('Error: No se pudo identificar tu sesión')
            return
        }

        setIsSaving(true)
        try {
            const result = await updateCustomerProfile(
                sessionData.customerId,
                name.trim() || undefined,
                phone.trim() || undefined
            )

            if (result.success && result.customer) {
                // Actualizar la sesión con los nuevos datos
                if (token) {
                    const expiresAt = new Date()
                    expiresAt.setDate(expiresAt.getDate() + 30)

                    // Guardar sesión con nombre actualizado
                    saveSession(token, {
                        customerId: sessionData.customerId,
                        email: sessionData.email,
                        name: result.customer.name || undefined,
                        companyId: companyId,
                        expiresAt: expiresAt.toISOString()
                    } as any)

                    // Actualizar también el teléfono en localStorage directamente
                    const updatedData = {
                        customerId: sessionData.customerId,
                        email: sessionData.email,
                        name: result.customer.name || undefined,
                        phone: result.customer.phone || undefined,
                        companyId: companyId,
                        expiresAt: expiresAt.toISOString()
                    }
                    localStorage.setItem('lunari_session_data', JSON.stringify(updatedData))
                    window.dispatchEvent(new Event('lunari_session_updated'))
                }

                toast.success('Perfil actualizado correctamente')
                setHasChanges(false)
            } else {
                toast.error(result.error || 'Error al actualizar el perfil')
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar el perfil')
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogout = () => {
        clearSession()
        toast.success('Sesión cerrada')
        router.push(`/portal/${companyId}`)
    }

    if (!isAuthenticated || !sessionData) {
        return null
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/portal/${companyId}`}
                    className="inline-flex items-center gap-2 text-gravel hover:text-orange transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Volver al catálogo</span>
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange/80 rounded-2xl flex items-center justify-center shadow-lg shadow-orange/20">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gravel mb-1">Mi Perfil</h1>
                        <p className="text-base text-ironside">
                            Gestiona tu información personal y accede a tus servicios
                        </p>
                    </div>
                </div>
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-orange/40 to-transparent"></div>
            </div>

            {/* Contenido */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información del Perfil */}
                <div className="lg:col-span-2">
                    <Card className="border-orange/30 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange/10 via-peach/20 to-orange/10 border-b border-orange/20 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gravel flex items-center gap-3 text-xl">
                                    <div className="w-10 h-10 bg-orange rounded-xl flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    Información Personal
                                </CardTitle>
                                {hasChanges && (
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-orange hover:bg-orange/90 text-white shadow-md"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                            <div className="space-y-6">
                                {/* Email */}
                                <div className="group">
                                    <Label htmlFor="email" className="text-gravel flex items-center gap-2 mb-3 font-semibold">
                                        <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center group-hover:bg-orange/20 transition-colors">
                                            <Mail className="w-4 h-4 text-orange" />
                                        </div>
                                        Correo Electrónico
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={sessionData.email || ''}
                                        disabled
                                        className="bg-cream border-orange/30 text-gravel h-12 text-base font-medium"
                                    />
                                    <p className="text-xs text-ironside mt-2 ml-10">
                                        Tu correo electrónico no puede ser modificado
                                    </p>
                                </div>

                                {/* Nombre */}
                                <div className="group">
                                    <Label htmlFor="name" className="text-gravel flex items-center gap-2 mb-3 font-semibold">
                                        <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center group-hover:bg-orange/20 transition-colors">
                                            <User className="w-4 h-4 text-orange" />
                                        </div>
                                        Nombre Completo
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ingresa tu nombre"
                                        className="bg-white border-orange/30 text-gravel h-12 text-base focus:border-orange focus:ring-2 focus:ring-orange/20"
                                    />
                                    <p className="text-xs text-ironside mt-2 ml-10">
                                        Puedes modificar tu nombre en cualquier momento
                                    </p>
                                </div>

                                {/* Teléfono */}
                                <div className="group">
                                    <Label htmlFor="phone" className="text-gravel flex items-center gap-2 mb-3 font-semibold">
                                        <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center group-hover:bg-orange/20 transition-colors">
                                            <Phone className="w-4 h-4 text-orange" />
                                        </div>
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+51 999 999 999"
                                        className="bg-white border-orange/30 text-gravel h-12 text-base focus:border-orange focus:ring-2 focus:ring-orange/20"
                                    />
                                    <p className="text-xs text-ironside mt-2 ml-10">
                                        Puedes modificar tu teléfono en cualquier momento
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Acciones Rápidas */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-orange/30 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange/10 via-peach/20 to-orange/10 border-b border-orange/20 px-6 py-5">
                            <CardTitle className="text-gravel text-lg font-semibold">Acciones Rápidas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 bg-white">
                            <Link href={`/portal/${companyId}/reservation`}>
                                <Button
                                    variant="outline"
                                    className="w-full border-orange/40 text-gravel hover:bg-orange hover:text-white hover:border-orange justify-start h-12 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Calendar className="w-5 h-5 mr-3" />
                                    <span className="font-medium">Mis Reservas</span>
                                </Button>
                            </Link>

                            <div className="mt-4">
                                <Link href={`/portal/${companyId}/shopping-cart`}>
                                    <Button
                                        variant="outline"
                                        className="w-full border-orange/40 text-gravel hover:bg-orange hover:text-white hover:border-orange justify-start h-12 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <ShoppingBag className="w-5 h-5 mr-3" />
                                        <span className="font-medium">Mi Carrito</span>
                                    </Button>
                                </Link>
                            </div>

                            <div className="pt-3 border-t border-orange/20 mt-3">
                                <Button
                                    onClick={handleLogout}
                                    variant="outline"
                                    className="w-full border-red-300/50 text-red-600 hover:bg-red-50 hover:border-red-300 justify-start h-12 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <LogOut className="w-5 h-5 mr-3" />
                                    <span className="font-medium">Cerrar Sesión</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información Adicional */}
                    <Card className="border-orange/30 shadow-md bg-gradient-to-br from-peach/30 to-orange/10 overflow-hidden">
                        <CardHeader className="border-b border-orange/20 px-4 py-4 bg-transparent">
                            <CardTitle className="text-gravel text-base font-semibold flex items-center gap-2">
                                <div className="w-6 h-6 bg-orange/20 rounded-lg flex items-center justify-center">
                                    <Mail className="w-3.5 h-3.5 text-orange" />
                                </div>
                                Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <p className="text-sm text-gravel leading-relaxed">
                                Puedes modificar tu nombre y teléfono directamente desde esta página.
                                Solo tu correo electrónico no puede ser modificado por seguridad.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

