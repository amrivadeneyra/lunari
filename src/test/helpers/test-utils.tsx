/**
 * Utilidades de ayuda para tests
 */

// @ts-ignore - Los tipos se cargarán cuando se instalen las dependencias
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Provedor personalizado para tests (si necesitas contextos, themes, etc.)
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Render personalizado que incluye todos los providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-exportar todo de React Testing Library
// @ts-ignore
export * from '@testing-library/react'
export { customRender as render }

