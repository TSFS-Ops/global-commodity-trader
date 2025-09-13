import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Leaf, Mail, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface ActionItem {
  icon: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  title: string;
  link: string;
  badge?: number;
}

interface ActionCenterProps {
  actions: ActionItem[];
}

export function ActionCenter({ actions }: ActionCenterProps) {
  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {actions.map((action, index) => (
          <Link key={index} to={action.link}>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-3 bg-neutral-100 hover:bg-neutral-200 rounded-md transition h-auto"
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.iconBgColor} ${action.iconColor}`}>
                  {action.icon}
                </div>
                <span className="ml-3 font-medium">{action.title}</span>
              </div>
              <div className="flex items-center">
                {action.badge !== undefined && (
                  <Badge className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center mr-2">
                    {action.badge}
                  </Badge>
                )}
                <ChevronRight className="text-neutral-600" size={16} />
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export const defaultActions: ActionItem[] = [
  {
    icon: <Search size={20} />,
    iconColor: "text-green-600",
    iconBgColor: "bg-green-100",
    title: "Find Products",
    link: "/listings"
  },
  {
    icon: <Plus size={20} />,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-100",
    title: "Create Hemp Listing",
    link: "/listings/new"
  },
  {
    icon: <Mail size={20} />,
    iconColor: "text-purple-600",
    iconBgColor: "bg-purple-100",
    title: "Messages",
    link: "/messages"
    // badge removed - will be populated by real unread message count when implemented
  }
];
