'use client'

import React from 'react'
import { ChatbotWidget } from './chatbot-widget'

interface PortalClientWrapperProps {
  companyId: string
  children: React.ReactNode
}

export function PortalClientWrapper({ companyId, children }: PortalClientWrapperProps) {
  return (
    <>
      {children}
      <ChatbotWidget companyId={companyId} />
    </>
  )
}

