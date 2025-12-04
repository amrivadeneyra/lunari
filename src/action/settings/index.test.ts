/**
 * Tests para server actions de configuración (settings)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    onIntegrateCompany,
    onGetAccountCompany,
    onUpdatePassword,
    onGetCurrentCompanyInfo,
    onUpdateCompany,
    onChatBotImageUpdate,
    onUpdateWelcomeMessage,
    onDeleteUserCompany,
    onCreateHelpDeskQuestion,
    onGetAllHelpDeskQuestions,
    onUpdateHelpDeskQuestion,
    onDeleteHelpDeskQuestion,
    onCreateFilterQuestions,
    onGetAllFilterQuestions,
    onUpdateFilterQuestion,
    onDeleteFilterQuestion,
    onCreateNewCompanyProduct,
    onUpdateCompanyProduct,
    onDeleteCompanyProduct,
    onToggleProductStatus,
    onGetAvailabilitySchedule,
    onUpdateAvailabilitySchedule,
    onGetCategories,
    onCreateCategory,
    onUpdateCategory,
    onDeleteCategory,
    onToggleCategory,
    onGetMaterials,
    onCreateMaterial,
    onUpdateMaterial,
    onDeleteMaterial,
    onToggleMaterial,
    onGetTextures,
    onCreateTexture,
    onUpdateTexture,
    onDeleteTexture,
    onToggleTexture,
    onGetSeasons,
    onCreateSeason,
    onUpdateSeason,
    onDeleteSeason,
    onToggleSeason,
    onGetUses,
    onCreateUse,
    onUpdateUse,
    onDeleteUse,
    onToggleUse,
    onGetFeatures,
    onCreateFeature,
    onUpdateFeature,
    onDeleteFeature,
    onToggleFeature,
} from './index'
import { mockPrismaClient } from '@/test/mocks/prisma'
import { mockCurrentUser, mockClerkClient } from '@/test/mocks/clerk'

describe('Settings Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentUser.mockResolvedValue({
            id: 'clerk-123',
        })
    })

    describe('onIntegrateCompany', () => {
        it('debe crear un nuevo dominio', async () => {
            mockPrismaClient.user.findFirst.mockResolvedValue(null)
            mockPrismaClient.user.update.mockResolvedValue({
                companies: [{ id: 'company-123' }],
            })

            const result = await onIntegrateCompany('Mi Empresa', 'icon.png')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Empresa agregada exitosamente')
            expect(result?.companyId).toBe('company-123')
        })

        it('debe retornar error si el dominio ya existe', async () => {
            mockPrismaClient.user.findFirst.mockResolvedValue({
                id: 'user-123',
            })

            const result = await onIntegrateCompany('Mi Empresa', 'icon.png')

            expect(result?.status).toBe(400)
            expect(result?.message).toBe('Una empresa con este nombre ya existe')
        })

        it('debe retornar undefined si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onIntegrateCompany('Mi Empresa', 'icon.png')

            expect(result).toBeUndefined()
        })
    })

    describe('onGetAllAccountCompanies', () => {
        it('debe obtener todos los dominios del usuario', async () => {
            const mockUser = {
                id: 'user-123',
                companies: [
                    {
                        id: 'company-1',
                        name: 'Empresa 1',
                        icon: 'icon1.png',
                        customer: [],
                    },
                ],
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)

            const result = await onGetAccountCompany()

            expect(result).toEqual(mockUser)
        })

        it('debe retornar estructura vacía si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onGetAccountCompany()

            expect(result).toEqual({
                id: '',
                company: null,
            })
        })

        it('debe retornar estructura vacía en caso de error', async () => {
            mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Error'))

            const result = await onGetAccountCompany()

            expect(result).toEqual({
                id: '',
                company: null,
            })
        })
    })

    describe('onUpdatePassword', () => {
        it('debe actualizar la contraseña', async () => {
            mockClerkClient.users.updateUser.mockResolvedValue({
                id: 'user-123',
            } as any)

            const result = await onUpdatePassword('newpassword123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Contraseña actualizada')
            expect(mockClerkClient.users.updateUser).toHaveBeenCalledWith(
                'clerk-123',
                { password: 'newpassword123' }
            )
        })

        it('debe retornar null si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onUpdatePassword('newpassword123')

            expect(result).toBeNull()
        })
    })

    describe('onGetCurrentCompanyInfo', () => {
        it('debe obtener información del dominio actual', async () => {
            const mockCompany = {
                id: 'company-123',
                name: 'Mi Empresa',
                icon: 'icon.png',
                chatBot: {
                    welcomeMessage: 'Bienvenido',
                },
            }

            const mockUserCompany = {
                companies: [mockCompany],
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUserCompany)

            const result = await onGetCurrentCompanyInfo('company-123')

            // La función retorna el objeto completo con companies
            expect(result).toEqual(mockUserCompany)
            expect(mockPrismaClient.user.findUnique).toHaveBeenCalled()
        })

        it('debe retornar null si no encuentra el dominio', async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue(null)

            const result = await onGetCurrentCompanyInfo('company-inexistente')

            expect(result).toBeNull()
        })

        it('debe retornar null si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onGetCurrentCompanyInfo('company-123')

            expect(result).toBeNull()
        })
    })

    describe('onUpdateCompany', () => {
        it('debe actualizar el nombre del dominio', async () => {
            mockPrismaClient.company.update.mockResolvedValue({
                id: 'company-123',
                name: 'Nuevo Nombre',
            })

            const result = await onUpdateCompany('company-123', 'Nuevo Nombre')

            expect(result?.status).toBe(200)
            expect(mockPrismaClient.company.update).toHaveBeenCalledWith({
                where: { id: 'company-123' },
                data: { name: 'Nuevo Nombre' },
            })
        })
    })

    describe('onCreateHelpDeskQuestion', () => {
        it('debe crear una pregunta FAQ', async () => {
            mockPrismaClient.company.update.mockResolvedValue({
                id: 'company-123',
                helpdesk: [
                    {
                        id: 'question-123',
                        question: '¿Cuál es el horario?',
                        answer: 'Lunes a Viernes 9am-6pm',
                    },
                ],
            })

            const result = await onCreateHelpDeskQuestion(
                'company-123',
                '¿Cuál es el horario?',
                'Lunes a Viernes 9am-6pm'
            )

            expect(result?.status).toBe(200)
            expect(mockPrismaClient.company.update).toHaveBeenCalled()
        })
    })

    describe('onGetAllHelpDeskQuestions', () => {
        it('debe obtener todas las preguntas FAQ', async () => {
            const mockQuestions = [
                {
                    id: 'q-1',
                    question: '¿Cuál es el horario?',
                    answer: 'Lunes a Viernes',
                },
            ]

            mockPrismaClient.helpDesk.findMany.mockResolvedValue(mockQuestions)

            const result = await onGetAllHelpDeskQuestions('company-123')

            expect(result?.status).toBe(200)
            expect(result?.questions).toEqual(mockQuestions)
        })
    })

    describe('onDeleteHelpDeskQuestion', () => {
        it('debe eliminar una pregunta FAQ', async () => {
            mockPrismaClient.helpDesk.delete.mockResolvedValue({
                id: 'question-123',
            })

            const result = await onDeleteHelpDeskQuestion('question-123')

            expect(result?.status).toBe(200)
            expect(mockPrismaClient.helpDesk.delete).toHaveBeenCalledWith({
                where: { id: 'question-123' },
            })
        })
    })

    describe('onCreateFilterQuestions', () => {
        it('debe crear una pregunta de filtro', async () => {
            mockPrismaClient.filterQuestions.create.mockResolvedValue({
                id: 'filter-123',
                question: '¿Qué tipo de producto buscas?',
            })

            const result = await onCreateFilterQuestions(
                'company-123',
                '¿Qué tipo de producto buscas?'
            )

            expect(result?.status).toBe(200)
        })
    })

    describe('onGetAllFilterQuestions', () => {
        it('debe obtener todas las preguntas de filtro', async () => {
            const mockQuestions = [
                {
                    id: 'f-1',
                    question: '¿Qué tipo de producto buscas?',
                },
            ]

            mockPrismaClient.filterQuestions.findMany.mockResolvedValue(mockQuestions)

            const result = await onGetAllFilterQuestions('company-123')

            expect(result?.status).toBe(200)
            expect(result?.questions).toEqual(mockQuestions)
        })
    })

    describe('onDeleteFilterQuestion', () => {
        it('debe eliminar una pregunta de filtro', async () => {
            mockPrismaClient.filterQuestions.delete.mockResolvedValue({
                id: 'filter-123',
            })

            const result = await onDeleteFilterQuestion('filter-123')

            expect(result?.status).toBe(200)
        })
    })

    describe('onCreateNewCompanyProduct', () => {
        it('debe crear un nuevo producto', async () => {
            mockPrismaClient.company.update.mockResolvedValue({
                id: 'company-123',
                products: [
                    {
                        id: 'product-123',
                        name: 'Tela de Algodón',
                        price: 50000,
                    },
                ],
            })

            const result = await onCreateNewCompanyProduct(
                'company-123',
                'Tela de Algodón',
                'https://example.com/image.jpg',
                '50000'
            )

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Producto creado exitosamente')
            expect(mockPrismaClient.company.update).toHaveBeenCalled()
        })
    })

    describe('onDeleteCompanyProduct', () => {
        it('debe eliminar un producto', async () => {
            mockPrismaClient.product.delete.mockResolvedValue({
                id: 'product-123',
            })

            const result = await onDeleteCompanyProduct('product-123')

            expect(result?.status).toBe(200)
        })
    })

    describe('onToggleProductStatus', () => {
        it('debe activar un producto', async () => {
            mockPrismaClient.product.findUnique.mockResolvedValue({
                id: 'product-123',
                active: false,
            })
            mockPrismaClient.product.update.mockResolvedValue({
                id: 'product-123',
                active: true,
            })

            const result = await onToggleProductStatus('product-123')

            expect(result?.status).toBe(200)
            expect(result?.active).toBe(true)
        })

        it('debe desactivar un producto', async () => {
            mockPrismaClient.product.findUnique.mockResolvedValue({
                id: 'product-123',
                active: true,
            })
            mockPrismaClient.product.update.mockResolvedValue({
                id: 'product-123',
                active: false,
            })

            const result = await onToggleProductStatus('product-123')

            expect(result?.status).toBe(200)
            expect(result?.active).toBe(false)
        })
    })

    describe('onGetAvailabilitySchedule', () => {
        it('debe obtener el horario de disponibilidad', async () => {
            const mockSchedule = [
                {
                    id: 'schedule-1',
                    dayOfWeek: 'MONDAY',
                    timeSlots: ['9:00am', '10:00am'],
                    isActive: true,
                },
            ]

            mockPrismaClient.availabilitySchedule.findMany.mockResolvedValue(mockSchedule)

            const result = await onGetAvailabilitySchedule('company-123')

            expect(result?.status).toBe(200)
            expect(result?.schedule).toEqual(mockSchedule)
        })
    })

    describe('onUpdateAvailabilitySchedule', () => {
        it('debe actualizar el horario de disponibilidad si existe', async () => {
            const existingSchedule = {
                id: 'schedule-1',
                dayOfWeek: 'MONDAY',
                timeSlots: ['9:00am'],
                isActive: true,
            }

            mockPrismaClient.availabilitySchedule.findUnique.mockResolvedValue(existingSchedule)
            mockPrismaClient.availabilitySchedule.update.mockResolvedValue({
                ...existingSchedule,
                timeSlots: ['9:00am', '10:00am'],
            })

            const result = await onUpdateAvailabilitySchedule(
                'company-123',
                'MONDAY',
                ['9:00am', '10:00am'],
                true
            )

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Horario actualizado exitosamente')
        })

        it('debe crear el horario si no existe', async () => {
            mockPrismaClient.availabilitySchedule.findUnique.mockResolvedValue(null)
            mockPrismaClient.availabilitySchedule.create.mockResolvedValue({
                id: 'schedule-1',
                dayOfWeek: 'MONDAY',
                timeSlots: ['9:00am', '10:00am'],
                isActive: true,
            })

            const result = await onUpdateAvailabilitySchedule(
                'company-123',
                'MONDAY',
                ['9:00am', '10:00am'],
                true
            )

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Horario creado exitosamente')
        })
    })

    describe('onGetCategories', () => {
        it('debe obtener todas las categorías', async () => {
            const mockCategories = [
                {
                    id: 'cat-1',
                    name: 'Telas',
                    active: true,
                },
            ]

            mockPrismaClient.category.findMany.mockResolvedValue(mockCategories)

            const result = await onGetCategories('company-123')

            expect(result).toEqual(mockCategories)
        })
    })

    describe('onCreateCategory', () => {
        it('debe crear una nueva categoría', async () => {
            mockPrismaClient.category.create.mockResolvedValue({
                id: 'cat-123',
                name: 'Telas',
            })

            const result = await onCreateCategory('company-123', 'Telas')

            expect(result?.status).toBe(200)
        })
    })

    describe('onDeleteCategory', () => {
        it('debe eliminar una categoría', async () => {
            mockPrismaClient.category.delete.mockResolvedValue({
                id: 'cat-123',
            })

            const result = await onDeleteCategory('cat-123')

            expect(result?.status).toBe(200)
        })
    })

    describe('onUpdateCategory', () => {
        it('debe actualizar una categoría', async () => {
            mockPrismaClient.category.update.mockResolvedValue({
                id: 'cat-123',
                name: 'Nueva Categoría',
            })

            const result = await onUpdateCategory('cat-123', 'Nueva Categoría')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Categoría actualizada exitosamente')
        })
    })

    describe('onToggleCategory', () => {
        it('debe activar una categoría', async () => {
            mockPrismaClient.category.findUnique.mockResolvedValue({
                id: 'cat-123',
                active: false,
            })
            mockPrismaClient.category.update.mockResolvedValue({
                id: 'cat-123',
                active: true,
            })

            const result = await onToggleCategory('cat-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe desactivar una categoría', async () => {
            mockPrismaClient.category.findUnique.mockResolvedValue({
                id: 'cat-123',
                active: true,
            })
            mockPrismaClient.category.update.mockResolvedValue({
                id: 'cat-123',
                active: false,
            })

            const result = await onToggleCategory('cat-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(false)
        })

        it('debe retornar error si la categoría no existe', async () => {
            mockPrismaClient.category.findUnique.mockResolvedValue(null)

            const result = await onToggleCategory('cat-inexistente')

            expect(result?.status).toBe(404)
        })
    })

    describe('onChatBotImageUpdate', () => {
        it('debe actualizar la imagen del chatbot', async () => {
            mockPrismaClient.company.update.mockResolvedValue({
                id: 'company-123',
                chatBot: {
                    icon: 'new-icon.png',
                },
            })

            const result = await onChatBotImageUpdate('company-123', 'new-icon.png')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Empresa actualizada')
        })

        it('debe retornar undefined si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onChatBotImageUpdate('company-123', 'icon.png')

            expect(result).toBeUndefined()
        })
    })

    describe('onUpdateWelcomeMessage', () => {
        it('debe actualizar el mensaje de bienvenida', async () => {
            mockPrismaClient.company.update.mockResolvedValue({
                id: 'company-123',
                chatBot: {
                    welcomeMessage: 'Nuevo mensaje',
                },
            })

            const result = await onUpdateWelcomeMessage('Nuevo mensaje', 'company-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Mensaje de bienvenida actualizado')
        })
    })

    describe('onDeleteUserCompany', () => {
        it('debe eliminar un dominio del usuario', async () => {
            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 'user-123',
            })
            mockPrismaClient.company.delete.mockResolvedValue({
                name: 'Mi Empresa',
            })

            const result = await onDeleteUserCompany('company-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toContain('fue eliminada exitosamente')
        })

        it('debe retornar undefined si no hay usuario', async () => {
            mockCurrentUser.mockResolvedValue(null)

            const result = await onDeleteUserCompany('company-123')

            expect(result).toBeUndefined()
        })
    })

    describe('onUpdateHelpDeskQuestion', () => {
        it('debe actualizar una pregunta FAQ', async () => {
            mockPrismaClient.helpDesk.update.mockResolvedValue({
                id: 'question-123',
                question: 'Nueva pregunta',
                answer: 'Nueva respuesta',
            })

            const result = await onUpdateHelpDeskQuestion('question-123', 'Nueva pregunta', 'Nueva respuesta')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Pregunta actualizada exitosamente')
        })
    })

    describe('onUpdateFilterQuestion', () => {
        it('debe actualizar una pregunta de filtro', async () => {
            mockPrismaClient.filterQuestions.update.mockResolvedValue({
                id: 'filter-123',
                question: 'Nueva pregunta',
            })

            const result = await onUpdateFilterQuestion('filter-123', 'Nueva pregunta')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Pregunta actualizada exitosamente')
        })
    })

    describe('onUpdateCompanyProduct', () => {
        it('debe actualizar un producto', async () => {
            mockPrismaClient.product.update.mockResolvedValue({
                id: 'product-123',
                name: 'Producto Actualizado',
                price: 60000,
            })

            const result = await onUpdateCompanyProduct('product-123', 'Producto Actualizado', '60000')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Producto actualizado exitosamente')
        })
    })

    // ===== MATERIALES =====
    describe('onGetMaterials', () => {
        it('debe obtener todos los materiales', async () => {
            const mockMaterials = [
                { id: 'mat-1', name: 'Algodón' },
                { id: 'mat-2', name: 'Poliester' },
            ]

            mockPrismaClient.material.findMany.mockResolvedValue(mockMaterials)

            const result = await onGetMaterials('company-123')

            expect(result).toEqual(mockMaterials)
        })
    })

    describe('onCreateMaterial', () => {
        it('debe crear un nuevo material', async () => {
            mockPrismaClient.material.create.mockResolvedValue({
                id: 'mat-123',
                name: 'Algodón',
            })

            const result = await onCreateMaterial('company-123', 'Algodón')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Material creado exitosamente')
        })
    })

    describe('onUpdateMaterial', () => {
        it('debe actualizar un material', async () => {
            mockPrismaClient.material.update.mockResolvedValue({
                id: 'mat-123',
                name: 'Algodón Premium',
            })

            const result = await onUpdateMaterial('mat-123', 'Algodón Premium')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Material actualizado exitosamente')
        })
    })

    describe('onDeleteMaterial', () => {
        it('debe eliminar un material', async () => {
            mockPrismaClient.material.delete.mockResolvedValue({
                id: 'mat-123',
            })

            const result = await onDeleteMaterial('mat-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Material eliminado exitosamente')
        })
    })

    describe('onToggleMaterial', () => {
        it('debe activar un material', async () => {
            mockPrismaClient.material.findUnique.mockResolvedValue({
                id: 'mat-123',
                active: false,
            })
            mockPrismaClient.material.update.mockResolvedValue({
                id: 'mat-123',
                active: true,
            })

            const result = await onToggleMaterial('mat-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe retornar error si el material no existe', async () => {
            mockPrismaClient.material.findUnique.mockResolvedValue(null)

            const result = await onToggleMaterial('mat-inexistente')

            expect(result?.status).toBe(404)
        })
    })

    // ===== TEXTURAS =====
    describe('onGetTextures', () => {
        it('debe obtener todas las texturas', async () => {
            const mockTextures = [
                { id: 'tex-1', name: 'Lisa' },
                { id: 'tex-2', name: 'Estampada' },
            ]

            mockPrismaClient.texture.findMany.mockResolvedValue(mockTextures)

            const result = await onGetTextures('company-123')

            expect(result).toEqual(mockTextures)
        })
    })

    describe('onCreateTexture', () => {
        it('debe crear una nueva textura', async () => {
            mockPrismaClient.texture.create.mockResolvedValue({
                id: 'tex-123',
                name: 'Lisa',
            })

            const result = await onCreateTexture('company-123', 'Lisa')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Textura creada exitosamente')
        })
    })

    describe('onUpdateTexture', () => {
        it('debe actualizar una textura', async () => {
            mockPrismaClient.texture.update.mockResolvedValue({
                id: 'tex-123',
                name: 'Estampada',
            })

            const result = await onUpdateTexture('tex-123', 'Estampada')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Textura actualizada exitosamente')
        })
    })

    describe('onDeleteTexture', () => {
        it('debe eliminar una textura', async () => {
            mockPrismaClient.texture.delete.mockResolvedValue({
                id: 'tex-123',
            })

            const result = await onDeleteTexture('tex-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Textura eliminada exitosamente')
        })
    })

    describe('onToggleTexture', () => {
        it('debe activar una textura', async () => {
            mockPrismaClient.texture.findUnique.mockResolvedValue({
                id: 'tex-123',
                active: false,
            })
            mockPrismaClient.texture.update.mockResolvedValue({
                id: 'tex-123',
                active: true,
            })

            const result = await onToggleTexture('tex-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe retornar error si la textura no existe', async () => {
            mockPrismaClient.texture.findUnique.mockResolvedValue(null)

            const result = await onToggleTexture('tex-inexistente')

            expect(result?.status).toBe(404)
        })
    })

    // ===== TEMPORADAS =====
    describe('onGetSeasons', () => {
        it('debe obtener todas las temporadas', async () => {
            const mockSeasons = [
                { id: 'sea-1', name: 'Verano' },
                { id: 'sea-2', name: 'Invierno' },
            ]

            mockPrismaClient.season.findMany.mockResolvedValue(mockSeasons)

            const result = await onGetSeasons('company-123')

            expect(result).toEqual(mockSeasons)
        })
    })

    describe('onCreateSeason', () => {
        it('debe crear una nueva temporada', async () => {
            mockPrismaClient.season.create.mockResolvedValue({
                id: 'sea-123',
                name: 'Verano',
            })

            const result = await onCreateSeason('company-123', 'Verano')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Temporada creada exitosamente')
        })
    })

    describe('onUpdateSeason', () => {
        it('debe actualizar una temporada', async () => {
            mockPrismaClient.season.update.mockResolvedValue({
                id: 'sea-123',
                name: 'Verano 2024',
            })

            const result = await onUpdateSeason('sea-123', 'Verano 2024')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Temporada actualizada exitosamente')
        })
    })

    describe('onDeleteSeason', () => {
        it('debe eliminar una temporada', async () => {
            mockPrismaClient.season.delete.mockResolvedValue({
                id: 'sea-123',
            })

            const result = await onDeleteSeason('sea-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Temporada eliminada exitosamente')
        })
    })

    describe('onToggleSeason', () => {
        it('debe activar una temporada', async () => {
            mockPrismaClient.season.findUnique.mockResolvedValue({
                id: 'sea-123',
                active: false,
            })
            mockPrismaClient.season.update.mockResolvedValue({
                id: 'sea-123',
                active: true,
            })

            const result = await onToggleSeason('sea-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe retornar error si la temporada no existe', async () => {
            mockPrismaClient.season.findUnique.mockResolvedValue(null)

            const result = await onToggleSeason('sea-inexistente')

            expect(result?.status).toBe(404)
        })
    })

    // ===== USOS =====
    describe('onGetUses', () => {
        it('debe obtener todos los usos', async () => {
            const mockUses = [
                { id: 'use-1', name: 'Interior' },
                { id: 'use-2', name: 'Exterior' },
            ]

            mockPrismaClient.use.findMany.mockResolvedValue(mockUses)

            const result = await onGetUses('company-123')

            expect(result).toEqual(mockUses)
        })
    })

    describe('onCreateUse', () => {
        it('debe crear un nuevo uso', async () => {
            mockPrismaClient.use.create.mockResolvedValue({
                id: 'use-123',
                name: 'Interior',
            })

            const result = await onCreateUse('company-123', 'Interior')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Uso creado exitosamente')
        })
    })

    describe('onUpdateUse', () => {
        it('debe actualizar un uso', async () => {
            mockPrismaClient.use.update.mockResolvedValue({
                id: 'use-123',
                name: 'Interior/Exterior',
            })

            const result = await onUpdateUse('use-123', 'Interior/Exterior')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Uso actualizado exitosamente')
        })
    })

    describe('onDeleteUse', () => {
        it('debe eliminar un uso', async () => {
            mockPrismaClient.use.delete.mockResolvedValue({
                id: 'use-123',
            })

            const result = await onDeleteUse('use-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Uso eliminado exitosamente')
        })
    })

    describe('onToggleUse', () => {
        it('debe activar un uso', async () => {
            mockPrismaClient.use.findUnique.mockResolvedValue({
                id: 'use-123',
                active: false,
            })
            mockPrismaClient.use.update.mockResolvedValue({
                id: 'use-123',
                active: true,
            })

            const result = await onToggleUse('use-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe retornar error si el uso no existe', async () => {
            mockPrismaClient.use.findUnique.mockResolvedValue(null)

            const result = await onToggleUse('use-inexistente')

            expect(result?.status).toBe(404)
        })
    })

    // ===== CARACTERÍSTICAS =====
    describe('onGetFeatures', () => {
        it('debe obtener todas las características', async () => {
            const mockFeatures = [
                { id: 'fea-1', name: 'Resistente al agua' },
                { id: 'fea-2', name: 'Antibacterial' },
            ]

            mockPrismaClient.feature.findMany.mockResolvedValue(mockFeatures)

            const result = await onGetFeatures('company-123')

            expect(result).toEqual(mockFeatures)
        })
    })

    describe('onCreateFeature', () => {
        it('debe crear una nueva característica', async () => {
            mockPrismaClient.feature.create.mockResolvedValue({
                id: 'fea-123',
                name: 'Resistente al agua',
            })

            const result = await onCreateFeature('company-123', 'Resistente al agua')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Característica creada exitosamente')
        })
    })

    describe('onUpdateFeature', () => {
        it('debe actualizar una característica', async () => {
            mockPrismaClient.feature.update.mockResolvedValue({
                id: 'fea-123',
                name: 'Resistente al agua y al sol',
            })

            const result = await onUpdateFeature('fea-123', 'Resistente al agua y al sol')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Característica actualizada exitosamente')
        })
    })

    describe('onDeleteFeature', () => {
        it('debe eliminar una característica', async () => {
            mockPrismaClient.feature.delete.mockResolvedValue({
                id: 'fea-123',
            })

            const result = await onDeleteFeature('fea-123')

            expect(result?.status).toBe(200)
            expect(result?.message).toBe('Característica eliminada exitosamente')
        })
    })

    describe('onToggleFeature', () => {
        it('debe activar una característica', async () => {
            mockPrismaClient.feature.findUnique.mockResolvedValue({
                id: 'fea-123',
                active: false,
            })
            mockPrismaClient.feature.update.mockResolvedValue({
                id: 'fea-123',
                active: true,
            })

            const result = await onToggleFeature('fea-123')

            expect(result?.status).toBe(200)
            expect(result?.data?.active).toBe(true)
        })

        it('debe retornar error si la característica no existe', async () => {
            mockPrismaClient.feature.findUnique.mockResolvedValue(null)

            const result = await onToggleFeature('fea-inexistente')

            expect(result?.status).toBe(404)
        })
    })
})

