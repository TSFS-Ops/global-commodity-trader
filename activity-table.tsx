import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Badge
} from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { 
  CirclePlus, 
  Handshake, 
  Leaf, 
  XCircle,
  CheckCircle,
  Clock
} from "lucide-react";

export type ActivityItem = {
  id: string;
  type: 'purchase' | 'contract' | 'carbon' | 'cancelled';
  title: string;
  subtitle: string;
  amount: string;
  quantity: string;
  status: 'completed' | 'processing' | 'cancelled';
  date: Date;
};

interface ActivityTableProps {
  data: ActivityItem[];
}

export function ActivityTable({ data }: ActivityTableProps) {
  const columns: ColumnDef<ActivityItem>[] = [
    {
      accessorKey: "type",
      header: "Transaction",
      cell: ({ row }) => {
        const item = row.original;
        let icon;
        let bgColor;
        
        switch(item.type) {
          case 'purchase':
            icon = <CirclePlus size={16} />;
            bgColor = "bg-green-100 text-green-600";
            break;
          case 'contract':
            icon = <Handshake size={16} />;
            bgColor = "bg-blue-100 text-blue-600";
            break;
          case 'carbon':
            icon = <Leaf size={16} />;
            bgColor = "bg-yellow-100 text-yellow-600";
            break;
          case 'cancelled':
            icon = <XCircle size={16} />;
            bgColor = "bg-red-100 text-red-600";
            break;
          default:
            icon = <CirclePlus size={16} />;
            bgColor = "bg-green-100 text-green-600";
        }
        
        return (
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full ${bgColor}`}>
              {icon}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-neutral-800">{item.title}</div>
              <div className="text-xs text-neutral-600">{item.subtitle}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        return (
          <div>
            <div className="text-sm text-neutral-800">{row.original.amount}</div>
            <div className="text-xs text-neutral-600">{row.original.quantity}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let badgeVariant;
        let BadgeIcon;
        
        switch(status) {
          case 'completed':
            badgeVariant = "bg-green-100 text-green-800";
            BadgeIcon = CheckCircle;
            break;
          case 'processing':
            badgeVariant = "bg-blue-100 text-blue-800";
            BadgeIcon = Clock;
            break;
          case 'cancelled':
            badgeVariant = "bg-red-100 text-red-800";
            BadgeIcon = XCircle;
            break;
          default:
            badgeVariant = "bg-neutral-100 text-neutral-800";
            BadgeIcon = Clock;
        }
        
        return (
          <Badge 
            variant="outline" 
            className={`px-2 py-1 ${badgeVariant} border-0 font-normal`}
          >
            <BadgeIcon size={12} className="mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const dateObj = row.original.date;
        const now = new Date();
        
        const isToday = dateObj.getDate() === now.getDate() && 
                       dateObj.getMonth() === now.getMonth() && 
                       dateObj.getFullYear() === now.getFullYear();
        
        const isYesterday = dateObj.getDate() === now.getDate() - 1 && 
                           dateObj.getMonth() === now.getMonth() && 
                           dateObj.getFullYear() === now.getFullYear();
        
        let display;
        if (isToday) {
          // Calculate hours/minutes ago
          const diffMs = now.getTime() - dateObj.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          
          if (diffHrs > 0) {
            display = `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
          } else {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            display = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
          }
        } else if (isYesterday) {
          display = 'Yesterday';
        } else {
          display = format(dateObj, 'MMM d, yyyy');
        }
        
        return <div className="text-sm text-neutral-600">{display}</div>;
      },
    },
  ];

  return (
    <DataTable 
      columns={columns} 
      data={data} 
      searchKey="title"
      searchPlaceholder="Search transactions..."
      showSearch={false}
    />
  );
}
