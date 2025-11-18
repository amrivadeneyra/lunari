'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from './product-card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getCompanyProducts } from '@/action/portal'

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
  texture?: { name: string } | null
  featured?: boolean
}

interface ProductCatalogProps {
  initialProducts: Product[]
  totalProducts: number
  totalPages: number
  currentPage: number
  companyId: string
  initialSearch?: string
  initialCategory?: string
  initialMaterial?: string
  initialSortBy?: 'recommended' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
  allCategories?: string[]
  allMaterials?: string[]
}

type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

export function ProductCatalog({
  initialProducts,
  totalProducts: initialTotal,
  totalPages: initialTotalPages,
  currentPage: initialPage,
  companyId,
  initialCategory,
  initialMaterial,
  initialSortBy = 'recommended',
  allCategories = [],
  allMaterials = []
}: ProductCatalogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState(initialProducts)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [totalProducts, setTotalProducts] = useState(initialTotal)
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(initialMaterial || null)

  // Construir URL con parámetros
  const buildUrl = (updates: {
    page?: number
    sortBy?: SortOption
    category?: string | null
    material?: string | null
    search?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.page !== undefined) {
      if (updates.page === 1) {
        params.delete('page')
      } else {
        params.set('page', updates.page.toString())
      }
    }

    if (updates.sortBy !== undefined) {
      if (updates.sortBy === 'recommended') {
        params.delete('sortBy')
      } else {
        params.set('sortBy', updates.sortBy)
      }
    }

    if (updates.category !== undefined) {
      if (!updates.category) {
        params.delete('category')
      } else {
        params.set('category', updates.category)
      }
    }

    if (updates.material !== undefined) {
      if (!updates.material) {
        params.delete('material')
      } else {
        params.set('material', updates.material)
      }
    }

    if (updates.search !== undefined) {
      if (!updates.search) {
        params.delete('search')
      } else {
        params.set('search', updates.search)
      }
    }

    return `/portal/${companyId}${params.toString() ? `?${params.toString()}` : ''}`
  }

  // Manejar cambio de ordenamiento
  const handleSortChange = (newSortBy: SortOption) => {
    router.push(buildUrl({ sortBy: newSortBy, page: 1 }))
  }

  // Manejar cambio de categoría
  const handleCategoryChange = (category: string | null) => {
    router.push(buildUrl({ category, page: 1 }))
  }

  // Manejar cambio de material
  const handleMaterialChange = (material: string | null) => {
    router.push(buildUrl({ material, page: 1 }))
  }

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    router.push(buildUrl({ page }))
  }

  // Sincronizar productos cuando cambien los parámetros de URL
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const page = parseInt(searchParams.get('page') || '1', 10)
        const sortBy = (searchParams.get('sortBy') || 'recommended') as SortOption
        const search = searchParams.get('search') || undefined
        const category = searchParams.get('category') || null
        const material = searchParams.get('material') || null

        const result = await getCompanyProducts({
          companyId,
          page,
          limit: 24,
          sortBy,
          search,
          category,
          material
        })

        setProducts(result.products)
        setCurrentPage(result.page)
        setTotalPages(result.totalPages)
        setTotalProducts(result.total)
        setSortBy(sortBy)
        setSelectedCategory(category)
        setSelectedMaterial(material)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [searchParams.toString(), companyId])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Filtros - Sidebar Style */}
      <div className="flex flex-col lg:flex-row gap-6 pb-4">
        {/* Sidebar de Filtros */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white border border-orange/20 rounded-lg p-4 space-y-4">
            {/* Título */}
            <div className="pb-2 border-b border-orange/20">
              <h3 className="text-sm font-semibold text-gravel">Filtros</h3>
            </div>

            {/* Accordion de Filtros */}
            <Accordion type="multiple" defaultValue={['categoria', 'material']} className="w-full">
              {/* Sección Categoría */}
              {allCategories.length > 0 && (
                <AccordionItem value="categoria" className="border-b border-orange/20">
                  <AccordionTrigger className="text-sm font-medium text-gravel hover:no-underline py-3">
                    Categoría
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-2">
                      {/* Botón Todas las categorías */}
                      <Button
                        variant={selectedCategory === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryChange(null)}
                        className={`w-full justify-start h-9 text-xs ${selectedCategory === null ? 'bg-orange hover:bg-orange/90 text-white' : 'border-orange/30 text-gravel hover:bg-peach'}`}
                      >
                        Todas las categorías
                      </Button>
                      {/* Categorías individuales */}
                      {allCategories.map(category => (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCategoryChange(category)}
                          className={`w-full justify-start h-9 text-xs ${selectedCategory === category ? 'bg-orange hover:bg-orange/90 text-white' : 'border-orange/30 text-gravel hover:bg-peach'}`}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Sección Material */}
              {allMaterials.length > 0 && (
                <AccordionItem value="material" className="border-b border-orange/20">
                  <AccordionTrigger className="text-sm font-medium text-gravel hover:no-underline py-3">
                    Material
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-2">
                      {/* Botón Todos los materiales */}
                      <Button
                        variant={selectedMaterial === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMaterialChange(null)}
                        className={`w-full justify-start h-9 text-xs ${selectedMaterial === null ? 'bg-orange hover:bg-orange/90 text-white' : 'border-orange/30 text-gravel hover:bg-peach'}`}
                      >
                        Todos los materiales
                      </Button>
                      {/* Materiales individuales */}
                      {allMaterials.map(material => (
                        <Button
                          key={material}
                          variant={selectedMaterial === material ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleMaterialChange(material)}
                          className={`w-full justify-start h-9 text-xs ${selectedMaterial === material ? 'bg-orange hover:bg-orange/90 text-white' : 'border-orange/30 text-gravel hover:bg-peach'}`}
                        >
                          {material}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </aside>

        {/* Contenido Principal */}
        <div className="flex-1 min-w-0">

          {/* Controles de ordenamiento y paginación */}
          {totalProducts > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0 pb-3">
              {/* Ordenamiento */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ironside">Ordenar por:</span>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-7 w-[160px] text-xs border-orange/30 text-gravel bg-white hover:bg-peach focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none data-[state=open]:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recomendados</SelectItem>
                    <SelectItem value="price-asc">Precio de menor a mayor</SelectItem>
                    <SelectItem value="price-desc">Precio de mayor a menor</SelectItem>
                    <SelectItem value="name-asc">Nombre de A a Z</SelectItem>
                    <SelectItem value="name-desc">Nombre de Z a A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="h-7 w-7 p-0 border-orange/30 text-gravel hover:bg-peach disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {/* Mostrar primera página */}
                    {currentPage > 3 && (
                      <>
                        <Button
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={isLoading}
                          className={`h-7 w-7 p-0 text-xs ${currentPage === 1
                            ? 'bg-orange hover:bg-orange/90 text-white'
                            : 'border-orange/30 text-gravel hover:bg-peach'
                            }`}
                        >
                          1
                        </Button>
                        {currentPage > 4 && <span className="text-xs text-ironside px-1">...</span>}
                      </>
                    )}

                    {/* Mostrar páginas alrededor de la actual */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className={`h-7 w-7 p-0 text-xs ${currentPage === pageNum
                            ? 'bg-orange hover:bg-orange/90 text-white'
                            : 'border-orange/30 text-gravel hover:bg-peach'
                            }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}

                    {/* Mostrar última página */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="text-xs text-ironside px-1">...</span>}
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={isLoading}
                          className={`h-7 w-7 p-0 text-xs ${currentPage === totalPages
                            ? 'bg-orange hover:bg-orange/90 text-white'
                            : 'border-orange/30 text-gravel hover:bg-peach'
                            }`}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || isLoading}
                    className="h-7 w-7 p-0 border-orange/30 text-gravel hover:bg-peach disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resultados */}
          <div className="pt-3 pb-2">
            <p className="text-xs text-ironside font-medium">
              {totalProducts} producto{totalProducts !== 1 ? 's' : ''} encontrado{totalProducts !== 1 ? 's' : ''}
              {totalPages > 1 && ` • Página ${currentPage} de ${totalPages}`}
            </p>
          </div>

          {/* Grid de productos */}
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-gravel text-base font-medium">Cargando productos...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gravel text-lg font-medium">No se encontraron productos</p>
              <p className="text-ironside text-sm mt-2">
                Intenta ajustar tus filtros de búsqueda
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
