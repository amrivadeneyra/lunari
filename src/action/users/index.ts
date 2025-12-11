'use server'

import { client } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs"

/**
 * Helper function para verificar permisos del usuario y obtener su companyId
 * @returns Object con companyId o null si no tiene permisos
 */
const getUserCompanyId = async (): Promise<{ companyId: string } | null> => {
    try {
        const user = await currentUser()
        if (!user) return null

        const currentUserData = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true }
                }
            }
        })

        if (!currentUserData?.company) return null

        return { companyId: currentUserData.company.id }
    } catch (error) {
        console.log('Error en getUserCompanyId:', error)
        return null
    }
}

/**
 * Helper function para verificar que un cliente pertenece a la empresa del usuario
 * @param customerId - ID del cliente
 * @param companyId - ID de la empresa
 * @returns true si el cliente pertenece a la empresa, false en caso contrario
 */
const verifyCustomerBelongsToCompany = async (
    customerId: string,
    companyId: string
): Promise<boolean> => {
    try {
        const customer = await client.customer.findFirst({
            where: {
                id: customerId,
                companyId: companyId
            },
            select: { id: true }
        })
        return !!customer
    } catch (error) {
        console.log('Error en verifyCustomerBelongsToCompany:', error)
        return false
    }
}

/**
 * Obtener todos los clientes (Customer) que pertenecen a una empresa específica
 * @param companyId - ID de la empresa
 * @returns Lista de clientes de la empresa
 */
export const onGetCompanyUsers = async (companyId: string) => {
    try {
        const userCompany = await getUserCompanyId()

        if (!userCompany) {
            return {
                status: 401,
                message: 'No autorizado',
                users: []
            }
        }

        if (userCompany.companyId !== companyId) {
            return {
                status: 403,
                message: 'No tienes permisos para ver usuarios de esta empresa',
                users: []
            }
        }

        // Obtener todos los clientes (Customer) que pertenecen a esta empresa
        const customers = await client.customer.findMany({
            where: {
                companyId: companyId
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return {
            status: 200,
            message: 'Usuarios obtenidos exitosamente',
            users: customers
        }
    } catch (error) {
        console.log('Error en onGetCompanyUsers:', error)
        return {
            status: 500,
            message: 'Error al obtener usuarios',
            users: []
        }
    }
}

/**
 * Obtener un cliente específico por ID
 * @param customerId - ID del cliente
 * @returns Datos del cliente
 */
export const onGetCustomerById = async (customerId: string) => {
    try {
        const userCompany = await getUserCompanyId()

        if (!userCompany) {
            return {
                status: 401,
                message: 'No autorizado',
                customer: null
            }
        }

        // Obtener el cliente y verificar que pertenece a la empresa del usuario
        const customer = await client.customer.findFirst({
            where: {
                id: customerId,
                companyId: userCompany.companyId
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
            }
        })

        if (!customer) {
            return {
                status: 404,
                message: 'Cliente no encontrado',
                customer: null
            }
        }

        return {
            status: 200,
            message: 'Cliente obtenido exitosamente',
            customer
        }
    } catch (error) {
        console.log('Error en onGetCustomerById:', error)
        return {
            status: 500,
            message: 'Error al obtener cliente',
            customer: null
        }
    }
}

/**
 * Actualizar un cliente específico
 * @param customerId - ID del cliente a actualizar
 * @param data - Datos a actualizar (name, email, phone, status)
 * @returns Resultado de la actualización
 */
export const onUpdateCustomer = async (
    customerId: string,
    data: {
        name?: string | null
        email?: string | null
        phone?: string | null
        status?: boolean
    }
) => {
    try {
        const userCompany = await getUserCompanyId()

        if (!userCompany) {
            return {
                status: 401,
                message: 'No autorizado'
            }
        }

        // Verificar que el cliente existe y pertenece a la empresa del usuario
        const belongsToCompany = await verifyCustomerBelongsToCompany(customerId, userCompany.companyId)

        if (!belongsToCompany) {
            return {
                status: 404,
                message: 'Cliente no encontrado'
            }
        }

        // Actualizar solo el cliente específico
        const updatedCustomer = await client.customer.update({
            where: {
                id: customerId
            },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                email: data.email !== undefined ? data.email : undefined,
                phone: data.phone !== undefined ? data.phone : undefined,
                status: data.status !== undefined ? data.status : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
            }
        })

        if (updatedCustomer) {
            return {
                status: 200,
                message: 'Cliente actualizado exitosamente',
                customer: updatedCustomer
            }
        }

        return {
            status: 400,
            message: 'Error al actualizar el cliente'
        }
    } catch (error) {
        console.log('Error en onUpdateCustomer:', error)
        return {
            status: 500,
            message: 'Error al actualizar cliente'
        }
    }
}

/**
 * Activar o desactivar un cliente específico
 * @param customerId - ID del cliente a activar/desactivar
 * @returns Resultado de la operación
 */
export const onToggleCustomerStatus = async (customerId: string) => {
    try {
        const userCompany = await getUserCompanyId()

        if (!userCompany) {
            return {
                status: 401,
                message: 'No autorizado'
            }
        }

        // Obtener el cliente actual para verificar su estado y que pertenece a la empresa
        const existingCustomer = await client.customer.findFirst({
            where: {
                id: customerId,
                companyId: userCompany.companyId
            },
            select: {
                id: true,
                status: true
            }
        })

        if (!existingCustomer) {
            return {
                status: 404,
                message: 'Cliente no encontrado'
            }
        }

        // Cambiar el estado (toggle)
        const updatedCustomer = await client.customer.update({
            where: {
                id: customerId
            },
            data: {
                status: !existingCustomer.status
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            }
        })

        if (updatedCustomer) {
            return {
                status: 200,
                message: updatedCustomer.status
                    ? 'Cliente activado exitosamente'
                    : 'Cliente desactivado exitosamente',
                customer: updatedCustomer
            }
        }

        return {
            status: 400,
            message: 'Error al cambiar el estado del cliente'
        }
    } catch (error) {
        console.log('Error en onToggleCustomerStatus:', error)
        return {
            status: 500,
            message: 'Error al cambiar el estado del cliente'
        }
    }
}

