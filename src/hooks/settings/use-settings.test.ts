/**
 * Tests para hooks de settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
    useChangePassword,
    useSettings,
    useHelpDesk,
    useFilterQuestions,
    useProducts,
    useCatalog,
} from './use-settings'

// Mock de useRouter
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}))

// Mock de useToast
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}))

// Mock de UploadClient
vi.mock('@uploadcare/upload-client', () => ({
    UploadClient: vi.fn(() => ({
        uploadFile: vi.fn(),
    })),
}))

// Mock de server actions
vi.mock('@/action/settings', async () => {
    const actual = await vi.importActual('@/action/settings')
    return {
        ...actual,
        onUpdatePassword: vi.fn(),
        onUpdateDomain: vi.fn(),
        onChatBotImageUpdate: vi.fn(),
        onUpdateWelcomeMessage: vi.fn(),
        onDeleteUserDomain: vi.fn(),
        onCreateHelpDeskQuestion: vi.fn(),
        onUpdateHelpDeskQuestion: vi.fn(),
        onDeleteHelpDeskQuestion: vi.fn(),
        onGetAllHelpDeskQuestions: vi.fn(),
        onCreateFilterQuestions: vi.fn(),
        onUpdateFilterQuestion: vi.fn(),
        onDeleteFilterQuestion: vi.fn(),
        onGetAllFilterQuestions: vi.fn(),
        onCreateNewDomainProduct: vi.fn(),
        onUpdateDomainProduct: vi.fn(),
        onDeleteDomainProduct: vi.fn(),
        onToggleProductStatus: vi.fn(),
        onGetCategories: vi.fn(),
        onCreateCategory: vi.fn(),
        onUpdateCategory: vi.fn(),
        onDeleteCategory: vi.fn(),
        onToggleCategory: vi.fn(),
        onGetMaterials: vi.fn(),
        onCreateMaterial: vi.fn(),
        onUpdateMaterial: vi.fn(),
        onDeleteMaterial: vi.fn(),
        onToggleMaterial: vi.fn(),
        onGetTextures: vi.fn(),
        onCreateTexture: vi.fn(),
        onUpdateTexture: vi.fn(),
        onDeleteTexture: vi.fn(),
        onToggleTexture: vi.fn(),
        onGetSeasons: vi.fn(),
        onCreateSeason: vi.fn(),
        onUpdateSeason: vi.fn(),
        onDeleteSeason: vi.fn(),
        onToggleSeason: vi.fn(),
        onGetUses: vi.fn(),
        onCreateUse: vi.fn(),
        onUpdateUse: vi.fn(),
        onDeleteUse: vi.fn(),
        onToggleUse: vi.fn(),
        onGetFeatures: vi.fn(),
        onCreateFeature: vi.fn(),
        onUpdateFeature: vi.fn(),
        onDeleteFeature: vi.fn(),
        onToggleFeature: vi.fn(),
    }
})

describe('useChangePassword', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar register, errors, onChangePassword y loading', () => {
        const { result } = renderHook(() => useChangePassword())

        expect(result.current).toHaveProperty('register')
        expect(result.current).toHaveProperty('errors')
        expect(result.current).toHaveProperty('onChangePassword')
        expect(result.current).toHaveProperty('loading')
        expect(typeof result.current.onChangePassword).toBe('function')
        expect(typeof result.current.loading).toBe('boolean')
    })
})

describe('useSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar register, onUpdateSettings, errors, loading, onDeleteDomain y deleting', () => {
        const { result } = renderHook(() => useSettings('domain-123'))

        expect(result.current).toHaveProperty('register')
        expect(result.current).toHaveProperty('onUpdateSettings')
        expect(result.current).toHaveProperty('errors')
        expect(result.current).toHaveProperty('loading')
        expect(result.current).toHaveProperty('onDeleteDomain')
        expect(result.current).toHaveProperty('deleting')
        expect(typeof result.current.onUpdateSettings).toBe('function')
        expect(typeof result.current.onDeleteDomain).toBe('function')
        expect(typeof result.current.loading).toBe('boolean')
        expect(typeof result.current.deleting).toBe('boolean')
    })
})

describe('useHelpDesk', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar propiedades necesarias', () => {
        const { result } = renderHook(() => useHelpDesk('domain-123'))

        expect(result.current).toHaveProperty('register')
        expect(result.current).toHaveProperty('errors')
        expect(result.current).toHaveProperty('onSubmitQuestion')
        expect(result.current).toHaveProperty('onDeleteQuestion')
        expect(result.current).toHaveProperty('loading')
        expect(result.current).toHaveProperty('deleting')
        expect(result.current).toHaveProperty('editingQuestion')
        expect(result.current).toHaveProperty('startEditing')
        expect(result.current).toHaveProperty('cancelEditing')
        expect(result.current).toHaveProperty('isQuestions')
        expect(typeof result.current.onSubmitQuestion).toBe('function')
        expect(typeof result.current.onDeleteQuestion).toBe('function')
    })
})

describe('useFilterQuestions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar propiedades necesarias', () => {
        const { result } = renderHook(() => useFilterQuestions('domain-123'))

        expect(result.current).toHaveProperty('register')
        expect(result.current).toHaveProperty('errors')
        expect(result.current).toHaveProperty('onAddFilterQuestions')
        expect(result.current).toHaveProperty('onDeleteQuestion')
        expect(result.current).toHaveProperty('loading')
        expect(result.current).toHaveProperty('deleting')
        expect(result.current).toHaveProperty('editingQuestion')
        expect(result.current).toHaveProperty('startEditing')
        expect(result.current).toHaveProperty('cancelEditing')
        expect(result.current).toHaveProperty('isQuestions')
        expect(typeof result.current.onAddFilterQuestions).toBe('function')
        expect(typeof result.current.onDeleteQuestion).toBe('function')
    })
})

describe('useProducts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar propiedades necesarias', () => {
        const { result } = renderHook(() => useProducts('domain-123'))

        expect(result.current).toHaveProperty('register')
        expect(result.current).toHaveProperty('errors')
        expect(result.current).toHaveProperty('onCreateNewProduct')
        expect(result.current).toHaveProperty('onUpdateProduct')
        expect(result.current).toHaveProperty('onDeleteProduct')
        expect(result.current).toHaveProperty('onToggleProduct')
        expect(result.current).toHaveProperty('loading')
        expect(result.current).toHaveProperty('deleting')
        expect(result.current).toHaveProperty('editingProduct')
        expect(result.current).toHaveProperty('startEditing')
        expect(result.current).toHaveProperty('cancelEditing')
        expect(result.current).toHaveProperty('categories')
        expect(result.current).toHaveProperty('materials')
        expect(typeof result.current.onCreateNewProduct).toBe('function')
        expect(typeof result.current.onUpdateProduct).toBe('function')
        expect(typeof result.current.onDeleteProduct).toBe('function')
        expect(typeof result.current.onToggleProduct).toBe('function')
    })
})

describe('useCatalog', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe retornar propiedades necesarias para category', () => {
        const { result } = renderHook(() => useCatalog('domain-123', 'category'))

        expect(result.current).toHaveProperty('items')
        expect(result.current).toHaveProperty('loading')
        expect(result.current).toHaveProperty('creating')
        expect(result.current).toHaveProperty('updating')
        expect(result.current).toHaveProperty('deleting')
        expect(result.current).toHaveProperty('editingId')
        expect(result.current).toHaveProperty('newItemName')
        expect(result.current).toHaveProperty('editItemName')
        expect(result.current).toHaveProperty('handleCreate')
        expect(result.current).toHaveProperty('handleUpdate')
        expect(result.current).toHaveProperty('handleDelete')
        expect(result.current).toHaveProperty('handleToggle')
        expect(result.current).toHaveProperty('startEditing')
        expect(result.current).toHaveProperty('cancelEditing')
        expect(typeof result.current.handleCreate).toBe('function')
        expect(typeof result.current.handleUpdate).toBe('function')
        expect(typeof result.current.handleDelete).toBe('function')
        expect(typeof result.current.handleToggle).toBe('function')
    })
})

