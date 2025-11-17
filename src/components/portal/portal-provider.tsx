'use client'

import React from 'react'
import { CartProvider } from '@/context/portal/cart-context'

interface PortalProviderProps {
  children: React.ReactNode
}

export function PortalProvider({ children }: PortalProviderProps) {
  return <CartProvider>{children}</CartProvider>
}

