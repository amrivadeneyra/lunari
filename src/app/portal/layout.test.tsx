import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Layout from './layout'

vi.mock('@/components/portal/banner', () => ({
    PortalBanner: () => <div data-testid="portal-banner" />,
}))

describe('Portal layout', () => {
    it('renderiza el banner y el contenido hijo', () => {
        render(
            <Layout>
                <div data-testid="child">Contenido</div>
            </Layout>,
        )

        expect(screen.getByTestId('portal-banner')).toBeInTheDocument()
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })
})

