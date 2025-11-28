import { getCompanyInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { BookOpen, MessageSquare, Sparkles, HelpCircle } from 'lucide-react'

type Props = {
  params: { companyid: string }
}

const GuidePage = async ({ params }: Props) => {
  const companyInfo = await getCompanyInfo(params.companyid)

  if (!companyInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper companyId={params.companyid}>
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Guía de Uso del Chatbot
          </h1>
          <p className="text-lg text-gray-600">
            Aprende a usar nuestro asistente virtual para encontrar los productos perfectos
          </p>
        </div>

        <div className="space-y-8">
          {/* Sección 1 */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  ¿Cómo iniciar una conversación?
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Haz clic en el ícono del chatbot ubicado en la esquina inferior derecha de la pantalla.
                  El asistente virtual se abrirá y te dará la bienvenida. Puedes comenzar haciendo preguntas
                  sobre nuestros productos, materiales, precios o cualquier consulta relacionada.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 2 */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  ¿Qué puedo preguntar?
                </h2>
                <ul className="text-gray-600 leading-relaxed space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span><strong>Productos:</strong> &quot;¿Qué telas de algodón tienen disponibles?&quot;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span><strong>Precios:</strong> &quot;¿Cuál es el precio de la tela de lino?&quot;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span><strong>Recomendaciones:</strong> &quot;Necesito una tela para hacer cortinas&quot;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span><strong>Disponibilidad:</strong> &quot;¿Tienen stock de algodón pima?&quot;</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sección 3 */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Recomendaciones del Asistente
                </h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  El chatbot puede recomendarte productos basándose en tus necesidades. Cuando te recomiende
                  un producto, puedes agregarlo directamente a tu carrito de reservas haciendo clic en el botón
                  correspondiente.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  También puedes pedirle que te ayude a agendar una cita para ver los productos en persona.
                  El asistente te guiará a través del proceso de reserva.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 4 */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Consejos para mejores resultados
                </h2>
                <ul className="text-gray-600 leading-relaxed space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Sé específico en tus preguntas para obtener respuestas más precisas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Menciona el uso que le darás al producto para recibir mejores recomendaciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Puedes hacer múltiples preguntas en la misma conversación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>El chatbot recuerda el contexto de la conversación</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </PortalClientWrapper>
  )
}

export default GuidePage

