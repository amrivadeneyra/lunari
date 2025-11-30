'use client'

import { useChatTime } from '@/hooks/conversation/use-conversation'
import React from 'react'
import { Card, CardContent, CardDescription } from '../ui/card'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { User } from 'lucide-react'
import { UrgentIcon } from '@/icons/urgent-icon'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description?: string
  createdAt: Date
  id: string
  onChat(): void
  seen?: boolean
  isFavorite?: boolean
  onToggleFavorite?: (isFavorite: boolean) => void
}

const ChatCard = ({
  title,
  description,
  createdAt,
  onChat,
  id,
  seen,
  isFavorite = false,
  onToggleFavorite,
}: Props) => {
  const { messageSentAt, urgent } = useChatTime(createdAt, id)

  // Si no se pasa seen, asumir que está leído por defecto
  const isUnread = seen === false

  return (
    <Card
      onClick={onChat}
      className={cn(
        "rounded-none border-r-0 cursor-pointer transition duration-150 ease-in-out",
        isUnread
          ? "bg-gray-100 hover:bg-gray-200"
          : "hover:bg-muted"
      )}
    >
      <CardContent className="py-4 flex gap-3">
        <div>
          <Avatar>
            <AvatarFallback className="bg-muted">
              <User />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex justify-between w-full">
          <div className="flex-1">
            <div className="flex gap-8 items-center">
              <CardDescription className="font-bold leading-none text-gray-600 pb-1">
                {title}
              </CardDescription>
              {urgent && !seen && <UrgentIcon />}
            </div>
            <CardDescription>
              {description
                ? description.substring(0, 45) + '...'
                : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[60px] flex justify-end">
              <CardDescription className="text-xs">
                {createdAt ? messageSentAt : ''}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatCard
