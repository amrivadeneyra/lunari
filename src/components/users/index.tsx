'use client'

import React, { useEffect, useState } from 'react'
import { DataTable } from '../table'
import { TableCell, TableRow } from '../ui/table'
import { onGetCompanyUsers, onGetCustomerById, onUpdateCustomer, onToggleCustomerStatus } from '@/action/users'
import { useToast } from '@/components/ui/use-toast'
import { Loader } from '../loader'
import { Users as UsersIcon, MoreVertical, Edit, UserX } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'

type Customer = {
    id: string
    name: string | null
    email: string | null
    status: boolean
}

type Props = {
    companyId: string
}

const UsersTable = ({ companyId }: Props) => {
    const [users, setUsers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
    const [loadingCustomer, setLoadingCustomer] = useState(false)
    const [saving, setSaving] = useState(false)
    const [togglingCustomerId, setTogglingCustomerId] = useState<string | null>(null)
    const [dialogError, setDialogError] = useState<string | null>(null)
    const { toast } = useToast()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: true,
    })

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            setError(null)
            try {
                const result = await onGetCompanyUsers(companyId)
                if (result.status === 200) {
                    setUsers(result.users)
                } else {
                    setError(result.message || 'Error al obtener usuarios')
                }
            } catch (err) {
                setError('Error al cargar usuarios')
                console.error('Error fetching users:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [companyId])

    // Función para abrir el modal de edición y cargar los datos del cliente
    const handleEditClick = async (customerId: string) => {
        setEditingCustomerId(customerId)
        setIsEditDialogOpen(true)
        setLoadingCustomer(true)
        setDialogError(null)

        try {
            const result = await onGetCustomerById(customerId)
            if (result.status === 200 && result.customer) {
                setFormData({
                    name: result.customer.name || '',
                    email: result.customer.email || '',
                    phone: result.customer.phone || '',
                    status: result.customer.status,
                })
            } else {
                setDialogError(result.message || 'Error al cargar datos del cliente')
            }
        } catch (err) {
            setDialogError('Error al cargar datos del cliente')
            console.error('Error fetching customer:', err)
        } finally {
            setLoadingCustomer(false)
        }
    }

    // Función para cerrar el modal
    const handleCloseDialog = () => {
        setIsEditDialogOpen(false)
        setEditingCustomerId(null)
        setFormData({
            name: '',
            email: '',
            phone: '',
            status: true,
        })
        setDialogError(null)
    }

    // Función para guardar los cambios del cliente
    const handleSaveChanges = async () => {
        if (!editingCustomerId) return

        setSaving(true)
        setDialogError(null)

        try {
            const result = await onUpdateCustomer(editingCustomerId, {
                name: formData.name || null,
                email: formData.email || null,
                phone: formData.phone || null,
                status: formData.status,
            })

            if (result.status === 200 && result.customer) {
                toast({
                    title: 'Éxito',
                    description: result.message || 'Cliente actualizado exitosamente',
                })

                // Actualizar solo el cliente específico en el estado local sin recargar toda la tabla
                // Esto evita el spinner y mejora la experiencia de usuario
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === editingCustomerId
                            ? {
                                id: result.customer!.id,
                                name: result.customer!.name,
                                email: result.customer!.email,
                                status: result.customer!.status,
                            }
                            : user
                    )
                )

                // Cerrar el modal
                handleCloseDialog()
            } else {
                setDialogError(result.message || 'Error al actualizar el cliente')
                toast({
                    title: 'Error',
                    description: result.message || 'Error al actualizar el cliente',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            const errorMessage = 'Error al guardar los cambios'
            setDialogError(errorMessage)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
            console.error('Error saving customer:', err)
        } finally {
            setSaving(false)
        }
    }

    // Función para activar/desactivar cliente
    const handleToggleStatus = async (customerId: string) => {
        setTogglingCustomerId(customerId)

        try {
            const result = await onToggleCustomerStatus(customerId)

            if (result.status === 200 && result.customer) {
                toast({
                    title: 'Éxito',
                    description: result.message || 'Estado del cliente actualizado exitosamente',
                })

                // Actualizar solo el cliente específico en el estado local sin recargar toda la tabla
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === customerId
                            ? {
                                id: result.customer!.id,
                                name: result.customer!.name,
                                email: result.customer!.email,
                                status: result.customer!.status,
                            }
                            : user
                    )
                )
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Error al cambiar el estado del cliente',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Error al cambiar el estado del cliente',
                variant: 'destructive',
            })
            console.error('Error toggling customer status:', err)
        } finally {
            setTogglingCustomerId(null)
        }
    }

    if (loading) {
        return (
            <div className="w-full h-full overflow-y-auto">
                <div className="w-full p-4 md:p-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader loading={true}>
                            <div className="text-gray-600">Cargando usuarios...</div>
                        </Loader>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full h-full overflow-y-auto">
                <div className="w-full p-4 md:p-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <UsersIcon className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Error al cargar usuarios
                        </h3>
                        <p className="text-sm text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full overflow-y-auto">
            <div className="w-full p-4 md:p-6">
                {/* Header principal */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 text-orange" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl md:text-2xl text-gray-900">Clientes de la Empresa</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Lista de todos los clientes que pertenecen a esta empresa
                            </p>
                        </div>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-orange/20 via-orange/40 to-orange/20"></div>
                </div>

                {users.length > 0 ? (
                    <DataTable headers={['Nombre', 'Email', 'Estado', 'Acciones']}>
                        {users.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium text-gray-900">
                                    {customer.name || <span className="text-gray-400 italic">Sin nombre</span>}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                    {customer.email || <span className="text-gray-400 italic">Sin email</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${customer.status
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {customer.status ? 'Activo' : 'Inactivo'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                aria-label="Opciones"
                                            >
                                                <MoreVertical className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={() => handleEditClick(customer.id)}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className={`cursor-pointer ${customer.status
                                                    ? 'text-red-600 focus:text-red-600'
                                                    : 'text-green-600 focus:text-green-600'
                                                    }`}
                                                onClick={() => handleToggleStatus(customer.id)}
                                                disabled={togglingCustomerId === customer.id}
                                            >
                                                {togglingCustomerId === customer.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg
                                                            className="animate-spin h-4 w-4"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            ></path>
                                                        </svg>
                                                        {customer.status ? 'Desactivando...' : 'Activando...'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <UserX className="w-4 h-4 mr-2" />
                                                        {customer.status ? 'Desactivar usuario' : 'Activar usuario'}
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </DataTable>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 mx-auto bg-orange/10 rounded-full flex items-center justify-center mb-4">
                            <UsersIcon className="w-8 h-8 text-orange" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay clientes registrados
                        </h3>
                        <p className="text-sm text-gray-600 mb-6 max-w-md">
                            Actualmente no hay clientes asociados a esta empresa.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de Edición */}
            <Dialog open={isEditDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            Editar Cliente
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600">
                            Modifica la información del cliente. Los cambios se guardarán al confirmar.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingCustomer ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader loading={true}>
                                <div className="text-gray-600">Cargando datos del cliente...</div>
                            </Loader>
                        </div>
                    ) : dialogError ? (
                        <div className="py-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{dialogError}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {/* Nombre */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                                    Nombre
                                </Label>
                                <Input
                                    id="edit-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nombre del cliente"
                                    className="w-full"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
                                    Correo Electrónico
                                </Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full"
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
                                    Teléfono
                                </Label>
                                <Input
                                    id="edit-phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Número de teléfono"
                                    className="w-full"
                                />
                            </div>

                            {/* Estado */}
                            <div className="flex items-center justify-between py-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="edit-status" className="text-sm font-medium text-gray-700">
                                        Estado
                                    </Label>
                                    <p className="text-xs text-gray-500">
                                        {formData.status ? 'Cliente activo' : 'Cliente inactivo'}
                                    </p>
                                </div>
                                <Switch
                                    id="edit-status"
                                    checked={formData.status}
                                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={loadingCustomer || saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveChanges}
                            disabled={loadingCustomer || saving}
                            className="bg-orange hover:bg-orange/90 text-white"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <svg
                                        className="animate-spin h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Guardando...
                                </span>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default UsersTable

