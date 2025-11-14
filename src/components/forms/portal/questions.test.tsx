import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import QuestionsForm from './questions'

describe('QuestionsForm', () => {
  const questions = [
    { id: '1', question: '¿Cuál es tu nombre?', answered: 'Ana' },
    { id: '2', question: '¿Cuál es tu correo?', answered: null },
  ]

  const register = vi.fn(() => ({})) as any
  const error = {}

  it('renderiza las preguntas con sus valores por defecto', () => {
    render(
      <QuestionsForm
        questions={questions}
        register={register}
        error={error}
        onNext={vi.fn()}
      />,
    )

    expect(screen.getByText('¿Cuál es tu nombre?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ana')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('No respondido')).toBeInTheDocument()
  })

  it('ejecuta onNext al hacer clic en Siguiente', () => {
    const onNext = vi.fn()

    render(
      <QuestionsForm
        questions={questions}
        register={register}
        error={error}
        onNext={onNext}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))

    expect(onNext).toHaveBeenCalled()
  })
})

