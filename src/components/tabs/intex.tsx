import React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type Props = {
  triggers: {
    label: string
    icon?: JSX.Element
  }[]
  children: React.ReactNode
  className?: string
  button?: JSX.Element
  onTabChange?: (value: string) => void
  value?: string
}

const TabsMenu = ({ triggers, children, className, button, onTabChange, value }: Props) => {
  return (
    <Tabs
      defaultValue={triggers[0].label}
      value={value}
      className="w-full flex flex-col flex-1 min-h-0"
      onValueChange={onTabChange}
    >
      <TabsList className={cn('w-full bg-transparent flex-shrink-0', className)}>
        {triggers.map((trigger, key) => (
          <TabsTrigger
            key={key}
            value={trigger.label}
            className="capitalize flex gap-1.5 items-center justify-center font-semibold text-xs px-3 py-2 flex-1 data-[state=active]:bg-orange data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-ironside hover:text-gravel"
          >
            {trigger.icon && trigger.icon}
            <span>{trigger.label}</span>
          </TabsTrigger>
        ))}
        {button}
      </TabsList>
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </Tabs>
  )
}

export default TabsMenu
