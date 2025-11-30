'use client'

import React from 'react'
import Image from 'next/image'
import { useCart } from '@/context/portal/cart-context'
import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  price: number
  salePrice?: number | null
  image: string
  description?: string | null
  stock: number
  unit?: string | null
  material?: { name: string } | null
  category?: { name: string } | null
  featured?: boolean
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        salePrice: product.salePrice,
        unit: product.unit,
      },
      1
    )
    toast.success(`${product.name} agregado al carrito`)
  }

  const finalPrice = product.salePrice || product.price
  const hasDiscount = product.salePrice && product.salePrice < product.price

  return (
    <div className="group bg-white rounded-md border border-orange/20 overflow-hidden hover:border-orange hover:shadow-sm transition-all duration-200 flex flex-col">
      {/* Imagen del producto */}
      <div className="relative w-full aspect-[3/2] bg-peach overflow-hidden">
        {product.featured && (
          <div className="absolute top-1 right-1 bg-orange text-white px-1.5 py-0.5 rounded text-[10px] font-semibold z-10 shadow-sm">
            Destacado
          </div>
        )}
        <Image
          src={`https://ucarecdn.com/${product.image}/`}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Contenido */}
      <div className="p-2 flex flex-col flex-1">
        {/* Categoría y Material */}
        {(product.category || product.material) && (
          <div className="flex flex-wrap gap-1 mb-1">
            {product.category && (
              <span className="text-[10px] bg-peach text-gravel px-1 py-0.5 rounded font-medium border border-orange/20">
                {product.category.name}
              </span>
            )}
            {product.material && (
              <span className="text-[10px] bg-peach text-gravel px-1 py-0.5 rounded font-medium border border-orange/20">
                {product.material.name}
              </span>
            )}
          </div>
        )}

        {/* Nombre */}
        <h3 className="font-semibold text-xs text-gravel mb-1 line-clamp-2 min-h-[2rem] leading-tight">
          {product.name}
        </h3>

        {/* Precio y Stock */}
        <div className="space-y-0.5 mb-2 mt-auto">
          {/* Precio */}
          <div className="flex items-baseline gap-1">
            {hasDiscount && (
              <span className="text-[10px] text-ironside/60 line-through">
                S/ {product.price}
              </span>
            )}
            <span className="text-base font-bold text-gravel">
              S/ {finalPrice}
            </span>
            {product.unit && (
              <span className="text-[10px] text-ironside font-normal">/ {product.unit}</span>
            )}
          </div>

          {/* Stock */}
          {product.stock > 0 ? (
            <span className="text-[10px] text-green-600 font-medium">
              {product.stock} unidades disponibles
            </span>
          ) : (
            <span className="text-[10px] text-red-600 font-medium">Agotado</span>
          )}
        </div>

        {/* Botón Agregar al Carrito */}
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-orange hover:bg-orange/90 text-white h-8 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed py-0"
        >
          <ShoppingCart className="w-3 h-3 mr-1" />
          Agregar
        </Button>
      </div>
    </div>
  )
}

