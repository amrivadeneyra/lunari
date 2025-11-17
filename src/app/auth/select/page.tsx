'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Building2, User, ArrowRight } from 'lucide-react'

const UserTypeSelectionPage = () => {
  const router = useRouter()

  const handleAdminClick = () => {
    router.push('/auth/sign-in')
  }

  const handleClientClick = () => {
    router.push('/portal/select')
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 via-cream to-orange-100">

      {/* Contenido principal centrado */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          {/* Título */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Bienvenido a Lunari
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Selecciona cómo deseas acceder
            </p>
          </div>

          {/* Cards de selección */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Card Administrador */}
            <div
              onClick={handleAdminClick}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-400 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative p-6 md:p-8">
                <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-xl mb-5 group-hover:bg-orange-500 transition-colors duration-300">
                  <User className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors duration-300" />
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                  Soy Administrador
                </h2>

                <p className="text-gray-600 mb-6 text-sm md:text-base leading-relaxed">
                  Accede al panel de control para gestionar tu empresa, productos, conversaciones y configuraciones.
                </p>

                <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700">
                  <span>Acceder</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>

            {/* Card Cliente */}
            <div
              onClick={handleClientClick}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-400 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative p-6 md:p-8">
                <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-xl mb-5 group-hover:bg-orange-500 transition-colors duration-300">
                  <Building2 className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                  Soy Cliente
                </h2>

                <p className="text-gray-600 mb-6 text-sm md:text-base leading-relaxed">
                  Explora productos, realiza reservas y comunícate con el asistente virtual de la empresa.
                </p>

                <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700">
                  <span>Explorar</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer compacto */}
      <div className="flex-shrink-0 pb-6 px-6 text-center">
        <p className="text-xs text-gray-500">
          ¿Necesitas ayuda?{' '}
          <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  )
}

export default UserTypeSelectionPage

