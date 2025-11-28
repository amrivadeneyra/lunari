'use client'

import React from 'react'
import { useRealTime } from '@/hooks/chatbot/use-chatbot'

type Props = {
    isHumanMode: boolean
    onToggle: (isHumanMode: boolean) => void
    disabled?: boolean
    chatRoomId?: string
    setChats?: React.Dispatch<React.SetStateAction<{
        role: 'user' | 'assistant'
        content: string
        link?: string | undefined
    }[]>>
}

const ChatModeToggle = ({ isHumanMode, onToggle, disabled = false, chatRoomId, setChats }: Props) => {
    useRealTime(chatRoomId || '', setChats || (() => { }))

    return (
        <div className="flex bg-peach/50 border border-orange/20 rounded-lg p-0.5 w-fit shadow-sm">
            <button
                onClick={() => {
                    onToggle(false)
                }}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${!isHumanMode
                    ? 'bg-orange text-white shadow-md'
                    : 'text-ironside hover:text-gravel'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                Asistente
            </button>

            <button
                onClick={() => {
                    onToggle(true)
                }}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${isHumanMode
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-ironside hover:text-gravel'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                Humano
            </button>
        </div>
    )
}

export default ChatModeToggle