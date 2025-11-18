import { getCompanyProducts, getCompanyInfo, getCompanyCatalogs } from '@/action/portal'
import { ProductCatalog } from '@/components/portal/product-catalog'
import { PortalClientWrapper } from '@/components/portal/portal-client-wrapper'
import { notFound } from 'next/navigation'
import React from 'react'

type Props = {
  params: { companyid: string }
  searchParams: {
    search?: string
    page?: string
    sortBy?: string
    category?: string
    material?: string
  }
}

const PortalPage = async ({ params, searchParams }: Props) => {
  const page = parseInt(searchParams.page || '1', 10)
  const sortBy = (searchParams.sortBy || 'recommended') as 'recommended' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

  const [productsData, companyInfo, catalogs] = await Promise.all([
    getCompanyProducts({
      companyId: params.companyid,
      page,
      limit: 24,
      sortBy,
      search: searchParams.search,
      category: searchParams.category || null,
      material: searchParams.material || null
    }),
    getCompanyInfo(params.companyid),
    getCompanyCatalogs(params.companyid)
  ])

  if (!companyInfo) {
    notFound()
  }

  return (
    <PortalClientWrapper companyId={params.companyid}>
      {/* Contenido Principal */}
      <main className="container mx-auto px-3 sm:px-4 py-6 max-w-full overflow-x-hidden">
        {/* Catálogo de Productos */}
        <ProductCatalog
          initialProducts={productsData.products}
          totalProducts={productsData.total}
          totalPages={productsData.totalPages}
          currentPage={productsData.page}
          companyId={params.companyid}
          initialSearch={searchParams.search}
          initialCategory={searchParams.category}
          initialMaterial={searchParams.material}
          initialSortBy={sortBy}
          allCategories={catalogs.categories}
          allMaterials={catalogs.materials}
        />
      </main>
    </PortalClientWrapper>
  )
}

export default PortalPage

