'use client'

import React, { useState } from 'react'
import { useCart } from '@/context/portal/cart-context'
import { ShoppingCart } from '@/components/portal/shopping-cart'
import { Button } from '@/components/ui/button'
import { ShoppingCart as ShoppingCartIcon } from 'lucide-react'

export function CartButton() {
  const { getItemCount } = useCart()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const itemCount = getItemCount()

  return (
    <>
      <Button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-14 h-14 shadow-lg"
      >
        <ShoppingCartIcon className="w-5 h-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Button>

      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </>
  )
}

