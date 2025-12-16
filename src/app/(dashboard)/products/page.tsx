import { onGetCurrentCompanyInfo } from '@/action/settings'
import ProductTable from '@/components/products'
import { redirect } from 'next/navigation'
import React from 'react'

// Forzar SSR para evitar error en build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { company: string } }

const ProductsPage = async ({ params }: Props) => {
  const companyData = await onGetCurrentCompanyInfo(params.company)
  if (!companyData || !companyData.company) redirect('/dashboard')

  const currentCompany = companyData.company

  return (
    <div className="w-full h-full overflow-hidden">
      <ProductTable
        id={currentCompany.id}
        products={currentCompany.products || []}
        catalogs={{
          categories: (currentCompany as any).categories || [],
          materials: (currentCompany as any).materials || [],
          textures: (currentCompany as any).textures || [],
          seasons: (currentCompany as any).seasons || [],
          uses: (currentCompany as any).uses || [],
          features: (currentCompany as any).features || [],
        }}
      />
    </div>
  )
}

export default ProductsPage
