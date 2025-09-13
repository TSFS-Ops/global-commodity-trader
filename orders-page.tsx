import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Loader2, Search, PackageCheck, ChevronRight, Filter, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type Order = {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  quantity: number;
  totalPrice: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  deliveryAddress: string | null;
  notes: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: {
    title: string;
    category: string;
  };
  seller?: {
    username: string;
  };
  buyer?: {
    username: string;
  };
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const role = user?.role || "buyer";

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Define columns for orders table
  const buyerColumns: ColumnDef<Order>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
    },
    {
      accessorKey: "listing.title",
      header: "Product",
      cell: ({ row }) => row.original.listing?.title || `Product #${row.original.listingId}`,
    },
    {
      accessorKey: "seller.username",
      header: "Seller",
      cell: ({ row }) => row.original.seller?.username || `Seller #${row.original.sellerId}`,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => <span className="font-medium">${row.original.totalPrice.toFixed(2)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusClasses = {
          pending: "bg-yellow-100 text-yellow-800",
          processing: "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
          cancelled: "bg-red-100 text-red-800",
        }[status];
        
        return (
          <Badge className={`${statusClasses} border-0`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <a href={`/orders/${row.original.id}`}>
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      ),
    },
  ];

  const sellerColumns: ColumnDef<Order>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
    },
    {
      accessorKey: "listing.title",
      header: "Product",
      cell: ({ row }) => row.original.listing?.title || `Product #${row.original.listingId}`,
    },
    {
      accessorKey: "buyer.username",
      header: "Buyer",
      cell: ({ row }) => row.original.buyer?.username || `Buyer #${row.original.buyerId}`,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => <span className="font-medium">${row.original.totalPrice.toFixed(2)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusClasses = {
          pending: "bg-yellow-100 text-yellow-800",
          processing: "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
          cancelled: "bg-red-100 text-red-800",
        }[status];
        
        return (
          <Badge className={`${statusClasses} border-0`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <a href={`/orders/${row.original.id}`}>
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      ),
    },
  ];

  const filterOrdersByStatus = (orders: Order[] | undefined, status: string) => {
    if (!orders) return [];
    if (status === "all") return orders;
    return orders.filter(order => order.status === status);
  };

  const filterOrdersByDate = (orders: Order[] | undefined, period: string) => {
    if (!orders) return [];
    if (period === "all") return orders;
    
    const now = new Date();
    const periodMap: Record<string, number> = {
      "today": 1,
      "week": 7,
      "month": 30,
      "quarter": 90,
    };
    
    const days = periodMap[period] || 0;
    const threshold = new Date(now.setDate(now.getDate() - days));
    
    return orders.filter(order => new Date(order.createdAt) >= threshold);
  };

  // Filter orders based on user role
  const filteredOrders = orders
    ? role === "buyer"
      ? (orders as Order[]).filter((order: Order) => order.buyerId === user?.id)
      : (orders as Order[]).filter((order: Order) => order.sellerId === user?.id)
    : [];
  
  // Apply status and date filters
  const statusFilteredOrders = filterOrdersByStatus(filteredOrders, statusFilter);
  const dateFilteredOrders = filterOrdersByDate(statusFilteredOrders, dateFilter);

  const table = useReactTable({
    data: dateFilteredOrders,
    columns: role === "buyer" ? buyerColumns : sellerColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2 md:mb-0">Order Management</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{role === "buyer" ? "My Purchases" : "Customer Orders"}</CardTitle>
          <CardDescription>
            {role === "buyer" 
              ? "Track your purchases and order history" 
              : "Manage and fulfill customer orders"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={role === 'buyer' ? 6 : 5} rows={10} showSearch={true} showPagination={true} />
          ) : filteredOrders.length === 0 ? (
            <div className="text-center p-8">
              <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders yet</h3>
              <p className="text-neutral-600 mb-4">
                {role === "buyer" 
                  ? "You haven't placed any orders yet."
                  : "You haven't received any orders yet."}
              </p>
              {role === "buyer" && (
                <Button onClick={() => window.location.href = '/listings'}>
                  Browse Listings
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    placeholder="Search by ID or product..."
                    value={(table.getColumn("listing.title")?.getFilterValue() as string) ?? ""}
                    onChange={(event) => table.getColumn("listing.title")?.setFilterValue(event.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <div className="w-40">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-full">
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Status</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-40">
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="h-full">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          <span>Time Period</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">Last 3 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
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
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-pointer hover:bg-neutral-50"
                          onClick={() => window.location.href = `/orders/${row.original.id}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Showing {table.getRowModel().rows.length} of{" "}
                  {filteredOrders.length} orders
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}