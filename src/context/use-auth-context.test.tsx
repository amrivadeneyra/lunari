import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
    AuthContextProvider,
    useAuthContextHook,
} from './use-auth-context'

describe('useAuthContextHook', () => {
    it('proporciona valores iniciales por defecto', () => {
        const { result } = renderHook(() => useAuthContextHook(), {
            wrapper: AuthContextProvider,
        })

        expect(result.current.currentStep).toBe(1)
        expect(typeof result.current.setCurrentStep).toBe('function')
    })

    it('permite actualizar el paso actual', () => {
        const { result } = renderHook(() => useAuthContextHook(), {
            wrapper: AuthContextProvider,
        })

        act(() => {
            result.current.setCurrentStep(2)
        })

        expect(result.current.currentStep).toBe(2)
    })

    it('usa valores iniciales cuando no hay provider', () => {
        const { result } = renderHook(() => useAuthContextHook())

        expect(result.current.currentStep).toBe(1)
        expect(typeof result.current.setCurrentStep).toBe('function')
    })
})

