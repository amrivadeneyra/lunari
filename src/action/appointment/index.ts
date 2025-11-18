'use server'

import { client } from "@/lib/prisma"
import { sendAppointmentConfirmation } from "@/action/mailer"
import { clerkClient } from '@clerk/nextjs'

export const onCompanyCustomerResponses = async (customerId: string) => {
    try {
        const customerQuestions = await client.customer.findUnique({
            where: {
                id: customerId,
            },
            select: {
                email: true,
                questions: {
                    select: {
                        id: true,
                        question: true,
                        answered: true,
                    },
                },
            },
        })

        if (customerQuestions) {
            return customerQuestions
        }
    } catch (error) {
        console.log(error)
    }
}

export const onGetAllCompanyBookings = async (companyId: string) => {
    try {
        const bookings = await client.bookings.findMany({
            where: {
                companyId,
            },
            select: {
                slot: true,
                date: true,
            },
        })

        if (bookings) {
            return bookings
        }
    } catch (error) {
        console.log(error)
    }
}


export const onBookNewAppointment = async (
    companyId: string,
    customerId: string,
    slot: string,
    date: string,
    email: string
) => {
    try {
        // Obtener información del cliente y dominio para el email
        const customerInfo = await client.customer.findUnique({
            where: { id: customerId },
            select: {
                name: true,
                email: true,
                Company: {
                    select: {
                        name: true,
                        User: {
                            select: { clerkId: true }
                        }
                    }
                }
            }
        })

        if (!customerInfo) {
            return { status: 404, message: 'Cliente no encontrado' }
        }

        // ✅ Crear la cita
        const booking = await client.bookings.create({
            data: {
                customerId,
                companyId,
                slot,
                date: new Date(date),
                email,
            },
        })

        if (booking) {
            // ✅ Enviar email de confirmación
            try {
                // Obtener email del propietario del dominio
                let companyOwnerEmail: string | undefined
                if (customerInfo.Company?.User?.clerkId) {
                    const user = await clerkClient.users.getUser(customerInfo.Company.User.clerkId)
                    companyOwnerEmail = user.emailAddresses[0]?.emailAddress
                }

                // Formatear fecha para el email
                const appointmentDate = new Date(date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })

                await sendAppointmentConfirmation(
                    email,
                    customerInfo.name || 'Cliente',
                    appointmentDate,
                    slot,
                    customerInfo.Company?.name || 'Empresa',
                    companyOwnerEmail
                )

                console.log('✅ Email de confirmación de cita enviado exitosamente')
            } catch (emailError) {
                console.error('❌ Error al enviar email de confirmación:', emailError)
            }

            return {
                status: 200,
                message: 'Reunión reservada y confirmación enviada',
                bookingId: booking.id // Retornar el ID del booking creado
            }
        }
    } catch (error) {
        console.error('❌ Error al reservar cita:', error)
        return { status: 500, message: 'Error al reservar la cita' }
    }
}

export const saveAnswers = async (
    questions: [question: string],
    customerId: string
) => {
    try {
        for (const question in questions) {
            await client.customer.update({
                where: { id: customerId },
                data: {
                    questions: {
                        update: {
                            where: {
                                id: question,
                            },
                            data: {
                                answered: questions[question],
                            },
                        },
                    },
                },
            })
        }
        return {
            status: 200,
            messege: 'Respuestas actualizadas',
        }
    } catch (error) {
        console.log(error)
    }
}

export const onGetAllBookingsForCurrentUser = async (clerkId: string) => {
    try {
        const bookings = await client.bookings.findMany({
            where: {
                Customer: {
                    Company: {
                        User: {
                            clerkId,
                        },
                    },
                },
            },
            select: {
                id: true,
                slot: true,
                createdAt: true,
                date: true,
                email: true,
                companyId: true,
                Customer: {
                    select: {
                        name: true,
                        email: true,
                        Company: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        })

        if (bookings) {
            return {
                bookings,
            }
        }

        return {
            bookings: [],
        }
    } catch (error) {
        console.log('Error getting bookings:', error)
        return {
            bookings: [],
        }
    }
}

export const onGetAvailableTimeSlotsForDay = async (companyId: string, date: Date) => {
    try {
        const dayOfWeekNumber = date.getDay()

        const dayMapping = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        const dayOfWeek = dayMapping[dayOfWeekNumber]

        const schedule = await client.availabilitySchedule.findUnique({
            where: {
                companyId_dayOfWeek: {
                    companyId,
                    dayOfWeek: dayOfWeek as any,
                },
            },
            select: {
                timeSlots: true,
                isActive: true,
            },
        })

        if (schedule && schedule.isActive) {
            return {
                status: 200,
                timeSlots: schedule.timeSlots,
            }
        }

        return {
            status: 200,
            timeSlots: [],
        }
    } catch (error) {
        console.log('Error getting time slots:', error)
        return {
            status: 400,
            timeSlots: [],
        }
    }
}