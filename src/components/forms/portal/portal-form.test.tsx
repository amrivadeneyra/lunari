import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PortalForm from './portal-form'

const mockUsePortal = vi.fn()
const mockPortalSteps = vi.fn(() => <div data-testid="portal-steps" />)

vi.mock('@/hooks/portal/use-portal', () => ({
    usePortal: (...args: any[]) => mockUsePortal(...args),
}))

vi.mock('./portal-steps', () => ({
    __esModule: true,
    default: (...args: Parameters<typeof mockPortalSteps>) => mockPortalSteps(...args),
}))

type PortalHookReturn = {
    step: number
    onNext: () => void
    onPrev: () => void
    register: () => unknown
    errors: Record<string, unknown>
    date: Date | undefined
    setDate: (value: Date | undefined) => void
    onBookAppointment: (event: any) => void
    onSelectedTimeSlot: (slot: string) => void
    selectedSlot: string
    loading: boolean
    availableSlots: string[]
    loadingSlots: boolean
}

describe('PortalForm', () => {
    let baseReturn: PortalHookReturn

    const questions = [
        { id: 'q1', question: 'Pregunta 1', answered: 'Sí' },
        { id: 'q2', question: 'Pregunta 2', answered: 'No' },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        baseReturn = {
            step: 1,
            onNext: vi.fn(),
            onPrev: vi.fn(),
            register: vi.fn(),
            errors: {},
            date: undefined,
            setDate: vi.fn(),
            onBookAppointment: vi.fn(),
            onSelectedTimeSlot: vi.fn(),
            selectedSlot: '',
            loading: false,
            availableSlots: [],
            loadingSlots: false,
        }
        mockUsePortal.mockReturnValue(baseReturn)
    })

    it('renderiza el formulario y pasa props a PortalSteps', () => {
        render(
            <PortalForm
                questions={questions}
                type="Appointment"
                customerId="customer-123"
                domainid="domain-123"
                email="test@example.com"
            />,
        )

        expect(mockPortalSteps).toHaveBeenCalledWith(
            expect.objectContaining({
                questions,
                step: 1,
                type: 'Appointment',
                loading: false,
            }),
            expect.anything(),
        )
    })

    it('llama a onNext automáticamente si todas las preguntas están respondidas', async () => {
        const onNext = vi.fn()
        const override: PortalHookReturn = Object.assign({}, baseReturn, { onNext })
        mockUsePortal.mockReturnValue(override)

        const answeredQuestions = questions.map((q) => ({ ...q, answered: 'Respuesta' }))

        render(
            <PortalForm
                questions={answeredQuestions}
                type="Appointment"
                customerId="customer-123"
                domainid="domain-123"
                email="test@example.com"
            />,
        )

        await waitFor(() => {
            expect(onNext).toHaveBeenCalled()
        })
    })

    it('ejecuta onBookAppointment al enviar el formulario', () => {
        const onBookAppointment = vi.fn((event) => event.preventDefault())

        const override: PortalHookReturn = Object.assign({}, baseReturn, { onBookAppointment })
        mockUsePortal.mockReturnValue(override)

        const { container } = render(
            <PortalForm
                questions={questions}
                type="Appointment"
                customerId="customer-123"
                domainid="domain-123"
                email="test@example.com"
            />,
        )

        fireEvent.submit(container.querySelector('form')!)

        expect(onBookAppointment).toHaveBeenCalled()
    })
})
