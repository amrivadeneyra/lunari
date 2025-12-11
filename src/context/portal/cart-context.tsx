'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface CartItem {
  productId: string
  product: {
    id: string
    name: string
    image: string
    price: number
    salePrice?: number | null
    unit?: string | null
  }
  quantity: number
  unit?: string
  width?: string
  weight?: string
  color?: string
  unitPrice: number
  totalPrice: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: CartItem['product'], quantity: number, details?: {
    unit?: string
    width?: string
    weight?: string
    color?: string
  }) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'portal-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Cargar carrito del localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
    }
  }, [])

  // Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [items])

  // Escuchar evento para limpiar el carrito
  useEffect(() => {
    const handleCartCleared = () => {
      setItems([])
    }

    window.addEventListener('lunari_cart_cleared', handleCartCleared)
    return () => {
      window.removeEventListener('lunari_cart_cleared', handleCartCleared)
    }
  }, [])

  // Escuchar evento para actualizar el carrito desde el asistente virtual
  useEffect(() => {
    const handleCartUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CartItem[]>
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setItems(customEvent.detail)
      }
    }

    window.addEventListener('lunari_cart_updated', handleCartUpdated)
    return () => {
      window.removeEventListener('lunari_cart_updated', handleCartUpdated)
    }
  }, [])

  const addItem = useCallback((
    product: CartItem['product'],
    quantity: number,
    details?: {
      unit?: string
      width?: string
      weight?: string
      color?: string
    }
  ) => {
    setItems((prev) => {
      const existingItemIndex = prev.findIndex(item => item.productId === product.id)

      if (existingItemIndex >= 0) {
        // Actualizar cantidad del item existente
        const existingItem = prev[existingItemIndex]
        const newQuantity = existingItem.quantity + quantity
        const unitPrice = product.salePrice || product.price
        const totalPrice = unitPrice * newQuantity

        const updated = [...prev]
        updated[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice,
          ...details, // Actualizar detalles si se proporcionan
        }
        return updated
      } else {
        // Agregar nuevo item
        const unitPrice = product.salePrice || product.price
        const totalPrice = unitPrice * quantity

        return [...prev, {
          productId: product.id,
          product,
          quantity,
          unitPrice,
          totalPrice,
          ...details,
        }]
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const totalPrice = item.unitPrice * quantity
          return { ...item, quantity, totalPrice }
        }
        return item
      })
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [items])

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

