//TODO: Update to bring back boxplot for simulation

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UseDamageDataResult, DamageDataRow } from '@/hooks/useDamageData';

interface DataTableProps {
  damageData: UseDamageDataResult;
}

// Sortable column header component
interface SortableHeaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any;
  title: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  title,
}) => {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="h-8 px-2 font-semibold"
    >
      {title}
      {column.getIsSorted() === 'asc' && (
        <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
      )}
      {column.getIsSorted() === 'desc' && (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
      {!column.getIsSorted() && <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
    </Button>
  );
};

// Format damage value
const formatDamage = (value: number): string => {
  return value.toFixed(2);
};

const columns: ColumnDef<DamageDataRow>[] = [
  {
    accessorKey: 'd4Count',
    header: ({ column }) => (
      <SortableHeader column={column} title="d4 Penalty" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('d4Count')}d4</div>
    ),
    enableSorting: true,
    size: 80,
  },
  {
    accessorKey: 'p5',
    header: ({ column }) => (
      <SortableHeader column={column} title="5th Percentile" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatDamage(row.getValue('p5'))}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'q1',
    header: ({ column }) => (
      <SortableHeader column={column} title="Q1 (25th)" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatDamage(row.getValue('q1'))}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'median',
    header: ({ column }) => (
      <SortableHeader column={column} title="Median" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatDamage(row.getValue('median'))}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'q3',
    header: ({ column }) => (
      <SortableHeader column={column} title="Q3 (75th)" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatDamage(row.getValue('q3'))}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'p95',
    header: ({ column }) => (
      <SortableHeader column={column} title="95th Percentile" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatDamage(row.getValue('p95'))}</div>
    ),
    enableSorting: true,
  },
];

export const DamageTable: React.FC<DataTableProps> = ({ damageData }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'd4Count', desc: false },
  ]);

  // Get table data from prop
  const { rows: tableData, viewMode } = damageData;

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-900/20'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-3 text-gray-900 dark:text-gray-100"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500 dark:text-gray-400"
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table legend/description */}
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-medium text-gray-700 dark:text-gray-300">
          {viewMode === 'absolute' ? 'Total Expected Damage by d4 Penalty' : 'Expected Damage Gain by d4 Penalty'}
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>d4 Penalty:</strong> Number of d4s subtracted from attack roll
          </li>
          <li>
            <strong>Percentiles:</strong> Distribution of {viewMode === 'absolute' ? 'total expected damage when using the d4s' : 'expected damage gain compared to not using d4s'}
          </li>
          <li>
            <strong>Click column headers:</strong> Sort the table by any metric
          </li>
        </ul>
      </div>
    </div>
  );
};
