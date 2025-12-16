import { getCompanyInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { HelpCircle, Mail, Phone, MessageCircle } from 'lucide-react'

type Props = {
  params: { companyid: string }
}

const HelpPage = async ({ params }: Props) => {
  const companyInfo = await getCompanyInfo(params.companyid)

  if (!companyInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper companyId={params.companyid}>
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Centro de Ayuda
          </h1>
          <p className="text-lg text-gray-600">
            Estamos aquí para ayudarte con cualquier consulta
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <MessageCircle className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Chat en Vivo</h3>
            <p className="text-gray-600 text-sm mb-4">
              Usa nuestro asistente virtual para obtener respuestas instantáneas
            </p>
            <p className="text-sm text-gray-500">
              Haz clic en el ícono del chatbot en la esquina inferior derecha
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Mail className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600 text-sm mb-4">
              Envíanos un correo y te responderemos en menos de 24 horas
            </p>
            <a
              href="mailto:emendozamego@gmail.com"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              emendozamego@gmail.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Phone className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Teléfono</h3>
            <p className="text-gray-600 text-sm mb-4">
              Llámanos de lunes a viernes de 9:00 AM a 6:00 PM
            </p>
            <a
              href="tel:+51999999999"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              +51 984 984 625
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <HelpCircle className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Preguntas Frecuentes</h3>
            <p className="text-gray-600 text-sm mb-4">
              Consulta nuestra guía de uso del chatbot
            </p>
            <a
              href={`/portal/${params.companyid}/guide`}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Ver Guía →
            </a>
          </div>
        </div>

        <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">¿Necesitas ayuda con algo específico?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Nuestro asistente virtual está disponible 24/7 para ayudarte con:
          </p>
          <ul className="text-gray-600 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Información sobre productos y materiales</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Consultas sobre precios y disponibilidad</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Recomendaciones personalizadas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Agendar citas para ver productos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">•</span>
              <span>Gestionar tus reservas</span>
            </li>
          </ul>
        </div>
      </main>
    </PortalClientWrapper>
  )
}

export default HelpPage

