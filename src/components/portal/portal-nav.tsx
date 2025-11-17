'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Menu, X, ShoppingBag, BookOpen, LogIn, User, Calendar, HelpCircle, Info, Search } from 'lucide-react'
import { useChatSession } from '@/hooks/chatbot/use-chat-session'
import { useCart } from '@/context/portal/cart-context'
import { Input } from '@/components/ui/input'
import { getSearchSuggestions } from '@/action/portal'
import Image from 'next/image'
import { toast } from 'sonner'

interface PortalNavProps {
    companyId: string
    companyName: string
    companyIcon?: string | null
}

interface SearchSuggestion {
    id: string
    name: string
    price: number
    salePrice?: number | null
    image: string
    category?: { name: string } | null
    material?: { name: string } | null
}

export function PortalNav({ companyId, companyName, companyIcon }: PortalNavProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { session } = useChatSession()
    const { getItemCount, addItem } = useCart()
    const sessionData = session.data
    const isAuthenticated = session.isAuthenticated
    const menuRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastUrlSearchRef = useRef<string>('')
    const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const searchContainerRef = useRef<HTMLDivElement>(null)

    const menuItems = [
        {
            label: 'Productos',
            href: `/portal/${companyId}`,
            icon: ShoppingBag,
            active: pathname === `/portal/${companyId}` || pathname === `/portal/${companyId}/products`
        },
        {
            label: 'Mis Reservas',
            href: `/portal/${companyId}/reservation`,
            icon: Calendar,
            active: pathname === `/portal/${companyId}/reservation`,
            requiresAuth: true
        },
        {
            label: 'Guía',
            href: `/portal/${companyId}/guide`,
            icon: BookOpen,
            active: pathname === `/portal/${companyId}/guide`
        },
        {
            label: 'Ayuda',
            href: `/portal/${companyId}/help`,
            icon: HelpCircle,
            active: pathname === `/portal/${companyId}/help`
        },
        {
            label: 'Sobre Nosotros',
            href: `/portal/${companyId}/about-us`,
            icon: Info,
            active: pathname === `/portal/${companyId}/about-us`
        }
    ]

    const visibleMenuItems = menuItems.filter(item =>
        !item.requiresAuth || isAuthenticated
    )

    // Cerrar menú al hacer clic fuera del menú
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!isMenuOpen) return

            const menuElement = document.querySelector('[data-menu-panel]')
            const menuButton = document.querySelector('[data-menu-button]')

            const target = event.target as Node

            // Si el clic está fuera del menú y fuera del botón, cerrar
            if (
                menuElement &&
                !menuElement.contains(target) &&
                menuButton &&
                !menuButton.contains(target)
            ) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            // Pequeño delay para evitar que se cierre inmediatamente al abrir
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside)
            }, 100)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    // Cerrar menú al cambiar de ruta
    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    // Sincronizar searchQuery con los parámetros de URL (solo cuando cambia la URL externamente)
    useEffect(() => {
        const urlSearch = searchParams.get('search') || ''
        // Solo actualizar si la URL cambió externamente (no por nuestra acción)
        if (urlSearch !== lastUrlSearchRef.current) {
            lastUrlSearchRef.current = urlSearch
            setSearchQuery(urlSearch)
            setShowSuggestions(false) // Ocultar sugerencias cuando se busca desde URL
        }
    }, [searchParams.toString()])

    // Obtener sugerencias de búsqueda (mínimo 3 caracteres)
    useEffect(() => {
        // Limpiar timeout anterior
        if (suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current)
        }

        const trimmedQuery = searchQuery.trim()

        // Si hay menos de 3 caracteres, ocultar sugerencias
        if (trimmedQuery.length < 3) {
            setSearchSuggestions([])
            setShowSuggestions(false)
            return
        }

        // Esperar 300ms después de que el usuario deje de escribir
        setIsLoadingSuggestions(true)
        suggestionsTimeoutRef.current = setTimeout(async () => {
            try {
                const suggestions = await getSearchSuggestions(companyId, trimmedQuery)
                setSearchSuggestions(suggestions as SearchSuggestion[])
                setShowSuggestions(suggestions.length > 0)
            } catch (error) {
                console.error('Error loading search suggestions:', error)
                setSearchSuggestions([])
                setShowSuggestions(false)
            } finally {
                setIsLoadingSuggestions(false)
            }
        }, 300)

        return () => {
            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current)
            }
        }
    }, [searchQuery, companyId])

    // Cerrar sugerencias y resetear input al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
                setSearchQuery('')
                setSearchSuggestions([])
            }
        }

        // Siempre escuchar clics fuera, no solo cuando hay sugerencias
        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // Manejar búsqueda al presionar Enter o hacer clic en buscar
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedQuery = searchQuery.trim()
        if (trimmedQuery.length >= 3) {
            setShowSuggestions(false)
            const params = new URLSearchParams(searchParams.toString())
            params.set('search', trimmedQuery)
            params.delete('page')
            router.push(`/portal/${companyId}?${params.toString()}`)
        }
    }

    // Manejar clic en un producto de sugerencias
    const handleSuggestionClick = (product: SearchSuggestion) => {
        setShowSuggestions(false)
        setSearchQuery('')
        // Redirigir a la página de productos con el producto buscado
        router.push(`/portal/${companyId}?search=${encodeURIComponent(product.name)}`)
    }

    // Manejar agregar producto al carrito desde sugerencias
    const handleAddToCartFromSuggestion = (e: React.MouseEvent, product: SearchSuggestion) => {
        e.stopPropagation()
        addItem(
            {
                id: product.id,
                name: product.name,
                image: product.image,
                price: product.price,
                salePrice: product.salePrice,
                unit: null,
            },
            1
        )
        toast.success(`${product.name} agregado al carrito`)
        setShowSuggestions(false)
    }

    return (
        <header className="border-b border-orange/20 bg-white sticky top-0 z-[100] shadow-sm w-full max-w-full px-4">
            <div className="flex items-center h-16 w-full max-w-full">
                {/* Menú Hamburguesa a la izquierda */}
                <button
                    data-menu-button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-orange transition-colors flex-shrink-0"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    <span className="text-sm font-medium hidden sm:inline">Menú</span>
                </button>

                {/* Logo y Nombre */}
                <Link href={`/portal/${companyId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 px-2">
                    {companyIcon && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-peach border border-orange/20">
                            <img
                                src={`https://ucarecdn.com/${companyIcon}/`}
                                alt={companyName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <h1 className="text-base sm:text-lg font-bold text-gravel hidden md:block">
                        {companyName}
                    </h1>
                </Link>

                {/* Barra de Búsqueda Central - Ocupa el espacio disponible */}
                <form onSubmit={handleSearch} className="flex-1 flex items-center min-w-0 px-2 sm:px-3 md:px-4 max-w-full relative">
                    <div ref={searchContainerRef} className="relative flex items-center w-full min-w-0 z-[9999]">
                        <div className="relative flex items-center w-full min-w-0">
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder={`Buscar en ${companyName}...`}
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    if (e.target.value.trim().length >= 3) {
                                        setShowSuggestions(true)
                                    }
                                }}
                                onFocus={() => {
                                    if (searchQuery.trim().length >= 3 && searchSuggestions.length > 0) {
                                        setShowSuggestions(true)
                                    }
                                }}
                                className="w-full h-10 pl-3 sm:pl-4 pr-12 border-gray-300 rounded-l-lg rounded-r-none focus:ring-0 focus:ring-offset-0 focus:border-orange-500 focus:outline-none text-sm sm:text-base min-w-0"
                            />
                            <button
                                type="submit"
                                className="h-10 px-3 sm:px-4 bg-orange hover:bg-orange/90 text-white rounded-r-lg transition-colors flex items-center justify-center flex-shrink-0"
                                aria-label="Buscar"
                            >
                                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* Dropdown de Sugerencias */}
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-orange/20 rounded-lg shadow-2xl z-[9999] max-h-[500px] overflow-y-auto">
                                {isLoadingSuggestions ? (
                                    <div className="p-4 text-center text-gravel text-sm">
                                        Buscando...
                                    </div>
                                ) : searchSuggestions.length > 0 ? (
                                    <div className="py-2">
                                        <div className="px-4 py-2 border-b border-orange/20">
                                            <p className="text-xs font-semibold text-gravel">
                                                Productos sugeridos
                                            </p>
                                        </div>
                                        <div className="divide-y divide-orange/10">
                                            {searchSuggestions.map((product) => {
                                                const finalPrice = product.salePrice || product.price
                                                const hasDiscount = product.salePrice && product.salePrice < product.price
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => handleSuggestionClick(product)}
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-peach/30 cursor-pointer transition-colors group"
                                                    >
                                                        {/* Imagen del producto */}
                                                        <div className="relative w-16 h-16 bg-peach rounded-lg overflow-hidden flex-shrink-0 border border-orange/20">
                                                            <Image
                                                                src={`https://ucarecdn.com/${product.image}/`}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>

                                                        {/* Información del producto */}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-semibold text-gravel mb-1 line-clamp-1 group-hover:text-orange transition-colors">
                                                                {product.name}
                                                            </h3>
                                                            {(product.category || product.material) && (
                                                                <div className="flex flex-wrap gap-1 mb-1">
                                                                    {product.category && (
                                                                        <span className="text-[10px] bg-peach text-gravel px-1.5 py-0.5 rounded font-medium border border-orange/20">
                                                                            {product.category.name}
                                                                        </span>
                                                                    )}
                                                                    {product.material && (
                                                                        <span className="text-[10px] bg-peach text-gravel px-1.5 py-0.5 rounded font-medium border border-orange/20">
                                                                            {product.material.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex items-baseline gap-1">
                                                                {hasDiscount && (
                                                                    <span className="text-xs text-ironside/60 line-through">
                                                                        S/ {product.price}
                                                                    </span>
                                                                )}
                                                                <span className="text-base font-bold text-gravel">
                                                                    S/ {finalPrice}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Botón agregar al carrito */}
                                                        <button
                                                            onClick={(e) => handleAddToCartFromSuggestion(e, product)}
                                                            className="p-2 bg-orange hover:bg-orange/90 text-white rounded-lg transition-colors flex-shrink-0 shadow-sm"
                                                            aria-label="Agregar al carrito"
                                                        >
                                                            <ShoppingBag className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="px-4 py-3 border-t border-orange/20">
                                            <button
                                                onClick={handleSearch}
                                                className="w-full text-sm font-medium text-orange hover:text-orange/80 transition-colors text-center"
                                            >
                                                Ver todos los resultados
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gravel text-sm">
                                        No se encontraron productos
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Right Side Actions */}
                <div className="flex items-center flex-shrink-0" ref={menuRef}>
                    {/* Separador */}
                    <div className="h-6 w-px bg-orange/20" />

                    {/* Iniciar Sesión / Perfil */}
                    {isAuthenticated ? (
                        <Link
                            href={`/portal/${companyId}/profile`}
                            className="flex flex-col items-start px-2 sm:px-3 py-2 hover:text-orange transition-colors"
                        >
                            <span className="text-xs text-ironside">Hola,</span>
                            <span className="text-sm font-medium text-gravel truncate max-w-[120px]">
                                {sessionData?.name || sessionData?.email?.split('@')[0] || 'Mi Perfil'}
                            </span>
                        </Link>
                    ) : (
                        <Link
                            href={`/portal/${companyId}/login`}
                            className="flex flex-col items-start px-2 sm:px-3 py-2 hover:text-orange transition-colors"
                        >
                            <span className="text-xs text-ironside">Hola,</span>
                            <span className="text-sm font-medium text-gravel">Inicia sesión</span>
                        </Link>
                    )}

                    {/* Separador */}
                    <div className="h-6 w-px bg-orange/20" />

                    {/* Mis Reservas */}
                    {isAuthenticated && (
                        <>
                            <Link
                                href={`/portal/${companyId}/reservation`}
                                className="px-2 sm:px-3 py-2 text-sm text-gravel hover:text-orange transition-colors hidden lg:block"
                            >
                                Mis reservas
                            </Link>
                            <div className="h-6 w-px bg-orange/20 hidden lg:block" />
                        </>
                    )}

                    {/* Separador */}
                    <div className="h-6 w-px bg-orange/20" />

                    {/* Carrito */}
                    <Link
                        href={`/portal/${companyId}/shopping-cart`}
                        className="relative p-2 text-gravel hover:text-orange transition-colors"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        {getItemCount() > 0 && (
                            <span className="absolute -top-1 -right-1 bg-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {getItemCount()}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Menu Desplegable - Pegado a la izquierda, sin overlay */}
            <div
                data-menu-panel
                className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-white border-r border-orange/20 shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <nav className="flex flex-col py-4">
                    {visibleMenuItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${item.active
                                    ? 'bg-peach text-orange border-l-4 border-orange'
                                    : 'text-gravel hover:bg-peach/50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Carrito */}
                    {getItemCount() > 0 && (
                        <Link
                            href={`/portal/${companyId}/shopping-cart`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gravel hover:bg-peach/50 transition-colors border-t border-orange/20 mt-2"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Carrito ({getItemCount()})
                        </Link>
                    )}

                    {/* Iniciar Sesión / Perfil */}
                    {isAuthenticated ? (
                        <Link
                            href={`/portal/${companyId}/profile`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gravel hover:bg-peach/50 transition-colors border-t border-orange/20 mt-2"
                        >
                            <User className="w-5 h-5" />
                            {sessionData?.name || sessionData?.email?.split('@')[0] || 'Mi Perfil'}
                        </Link>
                    ) : (
                        <Link
                            href={`/portal/${companyId}/login`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-6 py-3 bg-orange hover:bg-orange/90 text-white text-sm font-medium transition-colors border-t border-orange/20 mt-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Iniciar Sesión
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    )
}

