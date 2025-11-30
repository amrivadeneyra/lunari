import React from 'react'
import { AccordionContent, AccordionItem, AccordionTrigger, Accordion as ShadcnAccordion } from '@/components/ui/accordion'

type Props = {
  trigger: string
  content: string
}

const Accordion = ({ content, trigger }: Props) => {
  return (
    <ShadcnAccordion
      type="single"
      collapsible
      className="w-full"
    >
      <AccordionItem value="item-1" className="border-b border-orange/10">
        <AccordionTrigger className="text-xs py-3 hover:no-underline text-gravel font-normal data-[state=open]:text-gravel">
          {trigger}
        </AccordionTrigger>
        <AccordionContent className="text-xs text-ironside/70 pb-3 leading-relaxed">
          {content}
        </AccordionContent>
      </AccordionItem>
    </ShadcnAccordion>
  )
}

export default Accordion
