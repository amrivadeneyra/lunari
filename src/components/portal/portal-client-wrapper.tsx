'use client'

import React from 'react'
import { ChatbotWidget } from './chatbot-widget'

interface PortalClientWrapperProps {
  domainId: string
  children: React.ReactNode
}

export function PortalClientWrapper({ domainId, children }: PortalClientWrapperProps) {
  return (
    <>
      {children}
      <ChatbotWidget domainId={domainId} />
    </>
  )
}

