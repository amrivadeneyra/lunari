import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BookAppointmentDate from './booking-date'

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <button data-testid="calendar" onClick={() => onSelect(new Date('2024-12-31'))}>
      Calendar
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ onClick, children }: any) => (
    <div data-testid="card" onClick={onClick}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type = 'button' }: any) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/loader', () => ({
  Loader: ({ children }: any) => <span data-testid="loader">{children}</span>,
}))

describe('BookAppointmentDate', () => {
  const baseProps = {
    date: new Date('2024-12-31'),
    onBooking: vi.fn(),
    onBack: vi.fn(),
    register: vi.fn(() => ({})) as any,
    onSlot: vi.fn(),
    currentSlot: '',
    loading: false,
    bookings: [],
    availableSlots: ['10:00am'],
    loadingSlots: false,
  }

  it('muestra loader cuando loadingSlots es true', () => {
    render(
      <BookAppointmentDate
        {...baseProps}
        loadingSlots={true}
        availableSlots={[]}
      />,
    )

    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay horarios disponibles', () => {
    render(
      <BookAppointmentDate
        {...baseProps}
        availableSlots={[]}
      />,
    )

    expect(
      screen.getByText(/No hay horarios disponibles para este día/i),
    ).toBeInTheDocument()
  })

  it('permite seleccionar un horario disponible', () => {
    const onSlot = vi.fn()

    render(
      <BookAppointmentDate
        {...baseProps}
        onSlot={onSlot}
      />,
    )

    fireEvent.click(screen.getByTestId('card'))

    expect(onSlot).toHaveBeenCalledWith('10:00am')
  })

  it('no permite seleccionar un horario reservado', () => {
    const onSlot = vi.fn()
    render(
      <BookAppointmentDate
        {...baseProps}
        date={new Date('2024-12-31')}
        bookings={[
          {
            date: new Date('2024-12-31'),
            slot: '10:00am',
          },
        ]}
        onSlot={onSlot}
      />,
    )

    fireEvent.click(screen.getByTestId('card'))

    expect(onSlot).not.toHaveBeenCalled()
  })
})

