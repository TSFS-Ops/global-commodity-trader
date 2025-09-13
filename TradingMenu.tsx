import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, ChevronDown, Search, Leaf, RefreshCw, FileText } from "lucide-react";

type Cat = { code: string; label: string };

export default function TradingMenu() {
  const [cats, setCats] = useState<Cat[]>([]);
  const location = useLocation();

  useEffect(() => {
    fetch("/api/taxonomy").then(r=>r.json()).then(j=>{
      if (j.ok) setCats(j.taxonomy.categories);
    }).catch(()=>{});
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-1 text-white hover:text-[#d1e891] transition-colors cursor-pointer">
        <ShoppingCart size={20} />
        <span className="ml-1">Trading</span>
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg">
        <DropdownMenuItem className="p-0">
          <Link
            to="/listings"
            className={`w-full flex items-center px-3 py-2 ${
              location.pathname === "/listings" 
                ? "bg-[#a8c566]/20 text-[#173c1e]" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Search size={20} />
            <span className="ml-2">All Listings</span>
          </Link>
        </DropdownMenuItem>
        {cats.slice(0,6).map(c => (
          <DropdownMenuItem key={c.code} className="p-0">
            <Link
              to={`/listings?category_code=${encodeURIComponent(c.code)}`}
              className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
            >
              <Leaf size={20} />
              <span className="ml-2">{c.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {cats.length > 6 && (
          <DropdownMenuItem className="p-0">
            <Link
              to="/listings"
              className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
            >
              <Leaf size={20} />
              <span className="ml-2">More Categories...</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="p-0">
          <Link
            to="/buy-signals"
            className={`w-full flex items-center px-3 py-2 ${
              location.pathname === "/buy-signals" 
                ? "bg-[#a8c566]/20 text-[#173c1e]" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <RefreshCw size={20} />
            <span className="ml-2">Buy Signals</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-0">
          <Link
            to="/orders"
            className={`w-full flex items-center px-3 py-2 ${
              location.pathname === "/orders" 
                ? "bg-[#a8c566]/20 text-[#173c1e]" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="ml-2">Orders</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}