import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type DataTableProps = {
  headers: string[]
  children: React.ReactNode
}

export const DataTable = ({ headers, children }: DataTableProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <Table className="rounded-t-xl">
        <TableHeader>
          <TableRow className="bg-grandis">
            {headers.map((header, key) => (
              <TableHead
                key={key}
                className={cn(
                  key == headers.length - 1 && 'text-right',
                  'text-black text-xs'
                )}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white">{children}</TableBody>
      </Table>
    </div>
  )
}
