import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PortalSteps from './portal-steps'

vi.mock('./questions', () => ({
  __esModule: true,
  default: () => <div data-testid="questions-form" />,
}))

vi.mock('./booking-date', () => ({
  __esModule: true,
  default: () => <div data-testid="booking-form" />,
}))

const baseProps = {
  questions: [],
  type: 'Appointment' as const,
  register: vi.fn(),
  error: {},
  onNext: vi.fn(),
  step: 1,
  date: undefined as Date | undefined,
  onBooking: vi.fn(),
  onBack: vi.fn(),
  onSlot: vi.fn(),
  loading: false,
  slot: undefined,
  bookings: [],
  availableSlots: [],
  loadingSlots: false,
}

describe('PortalSteps', () => {
  it('renderiza QuestionsForm cuando step es 1', () => {
    render(<PortalSteps {...baseProps} step={1} />)

    expect(screen.getByTestId('questions-form')).toBeInTheDocument()
  })

  it('renderiza BookAppointmentDate cuando step es 2 y type Appointment', () => {
    render(<PortalSteps {...baseProps} step={2} type="Appointment" />)

    expect(screen.getByTestId('booking-form')).toBeInTheDocument()
  })

  it('renderiza mensaje de agradecimiento en otros pasos', () => {
    render(<PortalSteps {...baseProps} step={3} />)

    expect(screen.getByText(/Gracias por tomarse el tiempo/i)).toBeInTheDocument()
  })
})

