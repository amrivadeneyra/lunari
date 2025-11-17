'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { searchCompanies } from '@/action/portal'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  icon: string | null
}

const CompanySelectionPage = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [showResults, setShowResults] = useState(false)

  // Buscar empresas cuando el usuario escribe (con debounce)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setCompanies([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCompanies(searchQuery)
        setCompanies(results)
        setShowResults(true)
      } catch (error) {
        console.error('Error searching companies:', error)
        toast.error('Error al buscar empresas')
      }
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSelectCompany = (companyId: string) => {
    router.push(`/portal/${companyId}`)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await searchCompanies(searchQuery)
      if (results.length === 0) {
        toast.error('No se encontraron empresas con ese nombre')
        setIsSearching(false)
        return
      }
      
      // Si hay solo una empresa, redirigir directamente
      if (results.length === 1) {
        router.push(`/portal/${results[0].id}`)
      } else {
        // Si hay múltiples, mostrar resultados
        setCompanies(results)
        setShowResults(true)
        setIsSearching(false)
      }
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('Error al buscar empresas')
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-cream to-orange-100 p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={100}
            height={100}
            className="object-contain"
          />
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Acceder al Portal
          </h1>
          <p className="text-lg text-gray-600">
            Busca la empresa por nombre
          </p>
        </div>

        {/* Formulario de búsqueda */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar empresa por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
                disabled={isSearching}
                onFocus={() => {
                  if (companies.length > 0) setShowResults(true)
                }}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={!searchQuery.trim() || isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  Buscar Empresa
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Resultados de búsqueda */}
          {showResults && companies.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Resultados ({companies.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectCompany(company.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-200 hover:border-orange-300"
                  >
                    {company.icon && (
                      <div className="flex-shrink-0">
                        <img
                          src={`https://ucarecdn.com/${company.icon}/`}
                          alt={company.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {company.name}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && searchQuery.trim().length >= 2 && companies.length === 0 && !isSearching && (
            <div className="mt-4 border-t border-gray-200 pt-4 text-center">
              <p className="text-sm text-gray-500">
                No se encontraron empresas con ese nombre
              </p>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <Building2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 mb-1">¿No encuentras la empresa?</p>
                <p>
                  Verifica que estés escribiendo correctamente el nombre de la empresa. 
                  Si aún no la encuentras, contacta directamente con la empresa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Volver */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/auth/select')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Volver a la selección
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompanySelectionPage

