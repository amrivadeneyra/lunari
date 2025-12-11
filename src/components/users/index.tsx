'use client'

import React, { useEffect, useState } from 'react'
import { DataTable } from '../table'
import { TableCell, TableRow } from '../ui/table'
import { onGetCompanyUsers } from '@/action/users'
import { Loader } from '../loader'
import { Users as UsersIcon, MoreVertical, Edit, UserX } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
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

                <div className="bg-gray-50 rounded-lg p-3 md:p-4 lg:p-6 border border-gray-100 overflow-x-auto">
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
                                                    onClick={() => {
                                                        // TODO: Implementar funcionalidad de editar
                                                        console.log('Editar usuario:', customer.id)
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                                    onClick={() => {
                                                        // TODO: Implementar funcionalidad de desactivar
                                                        console.log('Desactivar usuario:', customer.id)
                                                    }}
                                                >
                                                    <UserX className="w-4 h-4 mr-2" />
                                                    Desactivar usuario
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
            </div>
        </div>
    )
}

export default UsersTable

