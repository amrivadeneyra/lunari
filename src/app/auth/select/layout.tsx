import React from 'react'

type Props = {
  children: React.ReactNode
}

const SelectLayout = ({ children }: Props) => {
  // Layout sin restricciones para la página de selección
  return <>{children}</>
}

export default SelectLayout

