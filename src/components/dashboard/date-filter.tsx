'use client'

import { Calendar, CalendarDays, CalendarRange, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'

export type DateRange = {
    from: Date
    to: Date
} | null

type DateFilterPreset = 'today' | 'week' | 'month' | 'last30' | 'last90' | 'custom'

type Props = {
    onDateChange: (range: DateRange, preset: DateFilterPreset) => void
    defaultPreset?: DateFilterPreset
}

const DateFilter = ({ onDateChange, defaultPreset = 'last30' }: Props) => {
    const [selectedPreset, setSelectedPreset] = useState<DateFilterPreset>(defaultPreset)
    const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    })
    const [customRange, setCustomRange] = useState<DateRange>(null)
    const [isCustomOpen, setIsCustomOpen] = useState(false)

    const getDateRange = (preset: DateFilterPreset): DateRange => {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const from = new Date()
        from.setHours(0, 0, 0, 0)

        switch (preset) {
            case 'today':
                return { from, to: today }
            case 'week':
                from.setDate(from.getDate() - 6)
                return { from, to: today }
            case 'month':
                from.setDate(1)
                return { from, to: today }
            case 'last30':
                from.setDate(from.getDate() - 29)
                return { from, to: today }
            case 'last90':
                from.setDate(from.getDate() - 89)
                return { from, to: today }
            case 'custom':
                return customRange
            default:
                from.setDate(from.getDate() - 29)
                return { from, to: today }
        }
    }

    const handlePresetChange = (preset: DateFilterPreset) => {
        setSelectedPreset(preset)
        const dateRange = getDateRange(preset)
        onDateChange(dateRange, preset)
        setIsCustomOpen(false)

        // Limpiar el estado del filtro personalizado cuando se cambia a otro preset
        if (preset !== 'custom') {
            setRange({ from: undefined, to: undefined })
            setCustomRange(null)
        }
    }

    const handleRangeSelect = (selectedRange: { from: Date | undefined; to: Date | undefined } | undefined) => {
        if (!selectedRange) {
            setRange({ from: undefined, to: undefined })
            return
        }

        setRange(selectedRange)

        // Solo aplicar automáticamente cuando se completa el rango (tiene inicio Y fin)
        if (selectedRange.from && selectedRange.to) {
            const dateRange: DateRange = {
                from: selectedRange.from,
                to: selectedRange.to
            }
            setCustomRange(dateRange)
            setSelectedPreset('custom')
            setIsCustomOpen(false)
            // Aplicar automáticamente el filtro solo cuando el rango está completo
            onDateChange(dateRange, 'custom')
        }
        // Si solo tiene inicio, NO aplicar el filtro aún
    }

    const handleClearCustomRange = () => {
        // Solo limpiar la selección temporal, NO aplicar ningún filtro
        setRange({ from: undefined, to: undefined })
        // No limpiar customRange aquí porque puede que el usuario quiera mantener el filtro aplicado
        // y solo cambiar las fechas seleccionadas
    }

    const handleClearFilter = () => {
        setRange({ from: undefined, to: undefined })
        setCustomRange(null)
        setSelectedPreset('last30')
        // NO aplicar el filtro aquí, solo limpiar el estado local
        // El usuario puede seleccionar nuevas fechas sin que se aplique automáticamente
        setIsCustomOpen(false)
    }

    const formatDateRange = (range: DateRange): string => {
        if (!range?.from || !range?.to) return 'Seleccionar rango'
        if (range.from.toDateString() === range.to.toDateString()) {
            return format(range.from, 'd MMM yyyy', { locale: es })
        }
        return `${format(range.from, 'd MMM', { locale: es })} - ${format(range.to, 'd MMM yyyy', { locale: es })}`
    }

    const presets = [
        { id: 'today' as DateFilterPreset, label: 'Hoy', icon: Calendar },
        { id: 'week' as DateFilterPreset, label: 'Esta Semana', icon: CalendarDays },
        { id: 'month' as DateFilterPreset, label: 'Este Mes', icon: CalendarDays },
        { id: 'last30' as DateFilterPreset, label: 'Últimos 30 días', icon: CalendarDays },
        { id: 'last90' as DateFilterPreset, label: 'Últimos 90 días', icon: CalendarDays },
    ]

    const isRangeComplete = range.from && range.to

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Botones de presets */}
            <div className="flex items-center gap-2 flex-wrap">
                {presets.map((preset) => {
                    const Icon = preset.icon
                    const isActive = selectedPreset === preset.id && selectedPreset !== 'custom'
                    return (
                        <Button
                            key={preset.id}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePresetChange(preset.id)}
                            className={cn(
                                "h-9 px-4 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-peach hover:bg-grandis text-gray-900 shadow-sm font-semibold"
                                    : "border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700"
                            )}
                        >
                            <Icon className="w-4 h-4 mr-2" />
                            {preset.label}
                        </Button>
                    )
                })}
            </div>

            {/* Selector de rango personalizado */}
            <Popover open={isCustomOpen} onOpenChange={(open) => {
                setIsCustomOpen(open)
                // Si se cierra el popover y no hay preset custom activo, limpiar el estado
                if (!open && selectedPreset !== 'custom') {
                    setRange({ from: undefined, to: undefined })
                }
            }}>
                <PopoverTrigger asChild>
                    <Button
                        variant={selectedPreset === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            "h-9 px-4 text-sm font-medium transition-all",
                            selectedPreset === 'custom'
                                ? "bg-peach hover:bg-grandis text-gray-900 shadow-sm font-semibold"
                                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700"
                        )}
                    >
                        <CalendarRange className="w-4 h-4 mr-2" />
                        {selectedPreset === 'custom' && customRange
                            ? formatDateRange(customRange)
                            : 'Rango Personalizado'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-xl border-gray-200 rounded-xl" align="end">
                    <div className="bg-gradient-to-br from-gray-50 to-white">
                        {/* Header */}
                        <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">Seleccionar Rango</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Elige la fecha de inicio y fin</p>
                                </div>
                                {(range.from || range.to) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearCustomRange}
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Calendario */}
                        <div className="p-6 flex justify-center">
                            <DayPicker
                                mode="range"
                                selected={range.from && range.to ? { from: range.from, to: range.to } : range}
                                onSelect={handleRangeSelect}
                                locale={es}
                                numberOfMonths={1}
                                className="rounded-lg"
                                classNames={{
                                    months: "flex flex-col",
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center mb-4",
                                    caption_label: "text-base font-semibold text-gray-900",
                                    nav: "space-x-1 flex items-center",
                                    nav_button: cn(
                                        "h-9 w-9 p-0 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors",
                                        "text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"
                                    ),
                                    nav_button_previous: "absolute left-1",
                                    nav_button_next: "absolute right-1",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex mb-3",
                                    head_cell: "text-gray-500 rounded-md w-11 font-semibold text-xs uppercase tracking-wider",
                                    row: "flex w-full mt-1.5",
                                    cell: "h-11 w-11 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected])]:bg-peach/60 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
                                    day: cn(
                                        "h-11 w-11 p-0 font-medium rounded-lg transition-all hover:bg-gray-100",
                                        "hover:scale-110 active:scale-95 cursor-pointer"
                                    ),
                                    day_range_start: "!bg-grandis !text-orange-900 !font-bold",
                                    day_range_end: "!bg-grandis !text-orange-900 !font-bold",
                                    day_range_middle: "!bg-peach !text-orange-800 !font-semibold",
                                    day_selected: "!bg-grandis !text-orange-900 !font-bold",
                                    day_today: "bg-gray-100 text-gray-900 font-semibold border-2 border-gray-400",
                                    day_outside: "text-gray-400 opacity-40",
                                    day_disabled: "text-gray-300 opacity-40 cursor-not-allowed",
                                    day_hidden: "invisible",
                                }}
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-white">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    {range.from && !range.to && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                            <span className="text-xs text-gray-600 font-medium">
                                                Selecciona la fecha final
                                            </span>
                                        </div>
                                    )}
                                    {!range.from && (
                                        <span className="text-xs text-gray-500">
                                            Haz clic en una fecha para comenzar
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {range.from && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearCustomRange}
                                            className="h-9 px-4 text-sm font-medium border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 whitespace-nowrap"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Limpiar selección
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default DateFilter
