import { getCompanyInfo } from '@/action/portal'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'
import { Info, Award, Users, Heart } from 'lucide-react'

type Props = {
  params: { companyid: string }
}

const AboutUsPage = async ({ params }: Props) => {
  const companyInfo = await getCompanyInfo(params.companyid)

  if (!companyInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper companyId={params.companyid}>
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Info className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sobre Nosotros
          </h1>
          <p className="text-lg text-gray-600">
            Conoce más sobre {companyInfo.name}
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Nuestra Historia
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Somos una empresa dedicada a ofrecer productos textiles de la más alta calidad.
              Con años de experiencia en el mercado, nos especializamos en proporcionar a nuestros
              clientes las mejores telas y materiales para sus proyectos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Nuestro compromiso es brindar un servicio excepcional y productos que superen
              las expectativas de nuestros clientes, combinando tradición y modernidad en
              cada uno de nuestros productos.
            </p>
          </section>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Calidad Premium</h3>
              <p className="text-sm text-gray-600">
                Productos seleccionados con los más altos estándares de calidad
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Atención Personalizada</h3>
              <p className="text-sm text-gray-600">
                Nuestro equipo está siempre disponible para ayudarte
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                <Heart className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Compromiso</h3>
              <p className="text-sm text-gray-600">
                Tu satisfacción es nuestra prioridad número uno
              </p>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Nuestra Misión
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Proporcionar productos textiles de excelente calidad que satisfagan las necesidades
              de nuestros clientes, mientras mantenemos un servicio al cliente excepcional y
              relaciones comerciales duraderas basadas en la confianza y el respeto mutuo.
            </p>
          </section>
        </div>
      </main>
    </PortalClientWrapper>
  )
}

export default AboutUsPage

