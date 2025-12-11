'use client'

import useSideBar from '@/context/use-sidebar'
import { ReactNode } from 'react'

type Props = {
    children: ReactNode
}

const ContentWrapper = ({ children }: Props) => {
    const { expand } = useSideBar()

    // En móvil: margen basado en el estado del sidebar (300px expandido, 60px colapsado)
    // En desktop: sin margen porque el sidebar es relative
    const getMarginClass = () => {
        if (expand === true) return 'ml-[300px]'
        if (expand === false) return 'ml-[60px]'
        return 'ml-[60px]' // Por defecto colapsado
    }

    return (
        <div className={`w-full h-screen flex flex-col overflow-hidden ${getMarginClass()} md:ml-0 transition-all duration-200`}>
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    )
}

export default ContentWrapper

