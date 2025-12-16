import { APPOINTMENT_TABLE_HEADER } from '@/constants/menu'
import React from 'react'
import { DataTable } from '../table'
import { TableCell, TableRow } from '../ui/table'
import { getMonthName } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

type Props = {
  bookings:
  | {
    Customer: {
      name: string | null
      email: string | null
      Company: {
        name: string
      } | null
    } | null
    id: string
    email: string
    companyId: string | null
    date: Date
    slot: string
    createdAt: Date
  }[]
  | undefined
}

const AllAppointments = ({ bookings }: Props) => {
  const hasBookings = bookings && bookings.length > 0

  return (
    <DataTable headers={APPOINTMENT_TABLE_HEADER}>
      {hasBookings ? (
        bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell className="text-xs">
              <div className="font-medium">{booking.Customer?.name || 'Sin nombre'}</div>
              <div className="text-gray-500 text-xs">{booking.email}</div>
            </TableCell>
            <TableCell className="text-xs">
              <div>
                {getMonthName(booking.date.getMonth())} {booking.date.getDate()}{' '}
                {booking.date.getFullYear()}
              </div>
              <div className="uppercase">{booking.slot}</div>
            </TableCell>
            <TableCell className="text-xs">
              <div>
                {getMonthName(booking.createdAt.getMonth())}{' '}
                {booking.createdAt.getDate()} {booking.createdAt.getFullYear()}
              </div>
              <div>
                {booking.createdAt.getHours().toString().padStart(2, '0')}:{booking.createdAt.getMinutes().toString().padStart(2, '0')}{' '}
                {booking.createdAt.getHours() > 12 ? 'PM' : 'AM'}
              </div>
            </TableCell>
            <TableCell className="text-right text-xs">
              {booking.Customer?.Company?.name}
            </TableCell>
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={APPOINTMENT_TABLE_HEADER.length} className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 mx-auto bg-orange/10 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay citas programadas
              </h3>
              <p className="text-sm text-gray-600 max-w-md">
                No tienes citas registradas en este momento. Las citas agendadas por tus clientes aparecerán aquí.
              </p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </DataTable>
  )
}

export default AllAppointments
