'use server'

import { client } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs"

/**
 * Obtener todos los clientes (Customer) que pertenecen a una empresa específica
 * @param companyId - ID de la empresa
 * @returns Lista de clientes de la empresa
 */
export const onGetCompanyUsers = async (companyId: string) => {
    try {
        const user = await currentUser()
        if (!user) {
            return {
                status: 401,
                message: 'No autorizado',
                users: []
            }
        }

        // Verificar que el usuario actual tiene acceso a esta empresa
        const currentUserData = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true }
                }
            }
        })

        if (!currentUserData?.company || currentUserData.company.id !== companyId) {
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
        const user = await currentUser()
        if (!user) {
            return {
                status: 401,
                message: 'No autorizado',
                customer: null
            }
        }

        // Verificar que el usuario actual tiene acceso a la empresa del cliente
        const currentUserData = await client.user.findUnique({
            where: { clerkId: user.id },
            select: {
                company: {
                    select: { id: true }
                }
            }
        })

        if (!currentUserData?.company) {
            return {
                status: 403,
                message: 'No tienes permisos para ver este cliente',
                customer: null
            }
        }

        // Obtener el cliente y verificar que pertenece a la empresa del usuario
        const customer = await client.customer.findFirst({
            where: {
                id: customerId,
                companyId: currentUserData.company.id
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

