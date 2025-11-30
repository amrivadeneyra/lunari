'use server'

import { client } from '@/lib/prisma'
import { generateSessionToken } from '@/lib/session'

type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

interface GetCompanyProductsParams {
    companyId: string
    page?: number
    limit?: number
    sortBy?: SortOption
    search?: string
    category?: string | null
    material?: string | null
}

/**
 * Obtiene productos activos de un dominio con paginación y ordenamiento (público)
 */
export const getCompanyProducts = async (params: GetCompanyProductsParams) => {
    try {
        const {
            companyId,
            page = 1,
            limit = 24,
            sortBy = 'recommended',
            search,
            category,
            material
        } = params

        // Construir filtros
        const where: any = {
            companyId,
            active: true,
        }

        // Filtro de búsqueda
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        // Filtro de categoría
        if (category) {
            where.category = {
                name: category
            }
        }

        // Filtro de material
        if (material) {
            where.material = {
                name: material
            }
        }

        // Construir ordenamiento
        let orderBy: any[] = []
        switch (sortBy) {
            case 'price-asc':
                orderBy = [{ salePrice: 'asc' }, { price: 'asc' }]
                break
            case 'price-desc':
                orderBy = [{ salePrice: 'desc' }, { price: 'desc' }]
                break
            case 'name-asc':
                orderBy = [{ name: 'asc' }]
                break
            case 'name-desc':
                orderBy = [{ name: 'desc' }]
                break
            case 'recommended':
            default:
                orderBy = [
                    { featured: 'desc' }, // Productos destacados primero
                    { createdAt: 'desc' }
                ]
                break
        }

        // Calcular skip
        const skip = (page - 1) * limit

        // Obtener productos paginados
        const [products, total] = await Promise.all([
            client.product.findMany({
                where,
                include: {
                    material: {
                        select: { name: true }
                    },
                    category: {
                        select: { name: true }
                    },
                    texture: {
                        select: { name: true }
                    },
                    season: {
                        select: { name: true }
                    },
                    uses: {
                        include: {
                            use: {
                                select: { name: true }
                            }
                        }
                    },
                    features: {
                        include: {
                            feature: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy,
                skip,
                take: limit
            }),
            client.product.count({ where })
        ])

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Error getting company products:', error)
        return {
            products: [],
            total: 0,
            page: 1,
            limit: 24,
            totalPages: 0
        }
    }
}

/**
 * Obtiene sugerencias de productos para búsqueda rápida (máximo 6 resultados)
 */
export const getSearchSuggestions = async (companyId: string, search: string) => {
    try {
        if (!search || search.length < 3) {
            return []
        }

        const where: any = {
            companyId,
            active: true,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        const products = await client.product.findMany({
            where,
            include: {
                material: {
                    select: { name: true }
                },
                category: {
                    select: { name: true }
                }
            },
            orderBy: [
                { featured: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 6 // Solo los primeros 6
        })

        return products
    } catch (error) {
        console.error('Error getting search suggestions:', error)
        return []
    }
}

/**
 * Obtiene información del dominio público
 */
export const getCompanyInfo = async (companyId: string) => {
    try {
        const company = await client.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                icon: true,
                chatBot: {
                    select: {
                        id: true,
                        welcomeMessage: true,
                        icon: true,
                        background: true,
                        textColor: true,
                    }
                }
            }
        })

        return company
    } catch (error) {
        console.error('Error getting company info:', error)
        return null
    }
}

/**
 * Busca empresas por nombre (para la página de selección de clientes)
 */
export const searchCompanies = async (search: string) => {
    try {
        const companies = await client.company.findMany({
            where: {
                name: {
                    contains: search,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                name: true,
                icon: true,
            },
            take: 10, // Limitar a 10 resultados
        });

        return companies;
    } catch (error) {
        console.error('Error searching companies:', error);
        return [];
    }
}

/**
 * Obtiene todas las categorías y materiales activos de un dominio (para filtros)
 */
export const getCompanyCatalogs = async (companyId: string) => {
    try {
        const [categories, materials] = await Promise.all([
            client.category.findMany({
                where: {
                    companyId,
                    active: true
                },
                select: {
                    name: true
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            client.material.findMany({
                where: {
                    companyId,
                    active: true
                },
                select: {
                    name: true
                },
                orderBy: {
                    name: 'asc'
                }
            })
        ])

        return {
            categories: categories.map(c => c.name),
            materials: materials.map(m => m.name)
        }
    } catch (error) {
        console.error('Error getting company catalogs:', error)
        return {
            categories: [],
            materials: []
        }
    }
}

/**
 * Crea una reserva de producto para un cliente
 */
export const createProductReservation = async (
    productId: string,
    customerId: string,
    quantity: number,
    details?: {
        unit?: string
        width?: string
        weight?: string
        color?: string
    },
    bookingId?: string // Opcional: ID de la cita a la que se asociará la reserva
) => {
    try {
        // Obtener el producto para calcular precios
        const product = await client.product.findUnique({
            where: { id: productId },
            select: {
                price: true,
                salePrice: true,
                unit: true,
                stock: true,
                companyId: true,
            }
        })

        if (!product) {
            throw new Error('Producto no encontrado')
        }

        // Verificar stock
        if (product.stock < quantity) {
            throw new Error(`Solo hay ${product.stock} ${product.unit || 'unidades'} disponibles`)
        }

        const unitPrice = product.salePrice || product.price
        const totalPrice = unitPrice * quantity

        // Crear la reserva
        const reservation = await client.productReservation.create({
            data: {
                productId,
                customerId,
                quantity,
                unitPrice,
                totalPrice,
                unit: details?.unit || product.unit || undefined,
                width: details?.width,
                weight: details?.weight,
                color: details?.color,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 días
                bookingId: bookingId || null, // Asociar a la cita si se proporciona
            },
            include: {
                Product: {
                    select: {
                        name: true,
                        image: true,
                        price: true,
                        salePrice: true,
                    }
                }
            }
        })

        return { success: true, reservation }
    } catch (error: any) {
        console.error('Error creating product reservation:', error)
        return { success: false, error: error.message || 'Error al crear la reserva' }
    }
}

/**
 * Crea múltiples reservas desde el carrito
 */
export const createMultipleReservations = async (
    items: Array<{
        productId: string
        quantity: number
        details?: {
            unit?: string
            width?: string
            weight?: string
            color?: string
        }
    }>,
    customerId: string,
    bookingId?: string // Opcional: ID de la cita a la que se asociarán las reservas
) => {
    try {
        const reservations: any[] = []

        for (const item of items) {
            const result = await createProductReservation(
                item.productId,
                customerId,
                item.quantity,
                item.details,
                bookingId // Pasar el bookingId si existe
            )

            if (result.success && result.reservation) {
                reservations.push(result.reservation)
            } else {
                throw new Error(result.error || 'Error al crear una reserva')
            }
        }

        return { success: true, reservations }
    } catch (error: any) {
        console.error('Error creating multiple reservations:', error)
        return { success: false, error: error.message || 'Error al crear las reservas' }
    }
}

/**
 * Obtiene las reservas de un cliente (método antiguo - por compatibilidad)
 */
export const getCustomerReservations = async (customerId: string) => {
    try {
        const reservations = await client.productReservation.findMany({
            where: {
                customerId,
                status: {
                    in: ['PENDING', 'CONFIRMED']
                }
            },
            select: {
                id: true,
                quantity: true,
                createdAt: true,
                expiresAt: true,
                status: true,
                Product: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        price: true,
                        salePrice: true,
                    }
                },
                Booking: {
                    select: {
                        id: true,
                        date: true,
                        slot: true,
                        appointmentType: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return reservations
    } catch (error) {
        console.error('Error getting customer reservations:', error)
        return []
    }
}

/**
 * Obtiene las citas (bookings) de un cliente con sus reservas de productos
 */
export const getCustomerBookings = async (customerId: string) => {
    try {
        const bookings = await client.bookings.findMany({
            where: {
                customerId
            },
            include: {
                reservations: {
                    where: {
                        status: {
                            in: ['PENDING', 'CONFIRMED']
                        }
                    },
                    include: {
                        Product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true,
                                salePrice: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        })

        // También obtener reservas sin cita asociada
        const reservationsWithoutBooking = await client.productReservation.findMany({
            where: {
                customerId,
                bookingId: null,
                status: {
                    in: ['PENDING', 'CONFIRMED']
                }
            },
            include: {
                Product: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        price: true,
                        salePrice: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return {
            bookings: bookings.filter(b => b.reservations.length > 0), // Solo bookings con reservas
            reservationsWithoutBooking
        }
    } catch (error) {
        console.error('Error getting customer bookings:', error)
        return {
            bookings: [],
            reservationsWithoutBooking: []
        }
    }
}

/**
 * Elimina una reserva
 */
export const deleteReservation = async (reservationId: string, customerId: string) => {
    try {
        const reservation = await client.productReservation.findUnique({
            where: { id: reservationId },
            select: {
                customerId: true,
                bookingId: true
            }
        })

        if (!reservation || reservation.customerId !== customerId) {
            return { success: false, error: 'No autorizado' }
        }

        if (reservation.bookingId) {
            const reservationsCount = await client.productReservation.count({
                where: {
                    bookingId: reservation.bookingId,
                    status: {
                        in: ['PENDING', 'CONFIRMED']
                    }
                }
            })

            if (reservationsCount === 1) {
                await client.productReservation.delete({
                    where: { id: reservationId }
                })

                // Luego eliminar la cita
                await client.bookings.delete({
                    where: { id: reservation.bookingId }
                })

                return { success: true, bookingDeleted: true }
            }
        }

        await client.productReservation.delete({
            where: { id: reservationId }
        })

        return { success: true, bookingDeleted: false }
    } catch (error: any) {
        console.error('Error deleting reservation:', error)
        return { success: false, error: error.message || 'Error al eliminar la reserva' }
    }
}

/**
 * Verifica si un cliente existe por email
 */
export const checkCustomerExists = async (companyId: string, email: string) => {
    try {
        const customer = await client.customer.findFirst({
            where: {
                email,
                companyId
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        })

        return {
            exists: !!customer,
            customer: customer || null
        }
    } catch (error) {
        console.error('Error checking customer:', error)
        return {
            exists: false,
            customer: null
        }
    }
}

/**
 * Crea o recupera una sesión de cliente
 */
export const createCustomerSession = async (
    companyId: string,
    email: string,
    name?: string,
    phone?: string
) => {
    try {
        // Buscar o crear cliente
        let customer = await client.customer.findFirst({
            where: {
                email,
                companyId
            }
        })

        if (!customer) {
            // Crear nuevo cliente
            customer = await client.customer.create({
                data: {
                    email,
                    name: name || null,
                    phone: phone || null,
                    companyId,
                    status: true
                }
            })
        } else {
            // Actualizar datos si se proporcionaron
            if (name || phone) {
                customer = await client.customer.update({
                    where: { id: customer.id },
                    data: {
                        ...(name && { name }),
                        ...(phone && { phone })
                    }
                })
            }
        }

        // Buscar o crear chatRoom
        // Nota: ChatRoom no tiene companyId directamente, se obtiene a través de Customer
        let chatRoom = await client.conversation.findFirst({
            where: {
                customerId: customer.id
            }
        })

        if (!chatRoom) {
            chatRoom = await client.conversation.create({
                data: {
                    customerId: customer.id
                }
            })
        }

        // Generar token de sesión
        const sessionToken = await generateSessionToken(
            customer.id,
            email,
            companyId,
            chatRoom.id
        )

        return {
            success: true,
            token: sessionToken.token,
            sessionData: sessionToken.sessionData
        }
    } catch (error: any) {
        console.error('Error creating customer session:', error)
        return {
            success: false,
            error: error.message || 'Error al crear la sesión'
        }
    }
}

/**
 * Actualiza los datos del perfil del cliente (nombre y teléfono)
 */
export const updateCustomerProfile = async (
    customerId: string,
    name?: string,
    phone?: string
) => {
    try {
        const customer = await client.customer.update({
            where: { id: customerId },
            data: {
                ...(name !== undefined && { name: name || null }),
                ...(phone !== undefined && { phone: phone || null })
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true
            }
        })

        return {
            success: true,
            customer
        }
    } catch (error: any) {
        console.error('Error updating customer profile:', error)
        return {
            success: false,
            error: error.message || 'Error al actualizar el perfil'
        }
    }
}

