import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PortalBanner } from './banner'

vi.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img data-testid="banner-image" {...props} />,
}))

describe('PortalBanner', () => {
    it('renderiza la imagen del logo en el banner', () => {
        render(<PortalBanner />)

        const image = screen.getByTestId('banner-image')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('alt', 'LOGO')
        expect(image).toHaveAttribute('src', '/images/logo.png')
    })
})

