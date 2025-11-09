
'use client';

import { cn } from "@/lib/utils";
import { Home, User, Wallet, Package, MessageSquare, LogOut, Users, Gift, LucideIcon } from "lucide-react";
import React from "react";

const icons: { [key: string]: LucideIcon } = {
  Home,
  User,
  Wallet,
  Package,
  MessageSquare,
  LogOut,
  Users,
  Gift,
};

export interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof icons;
  isCentral?: boolean;
  onClick?: () => void;
}

interface BottomNavBarProps<T extends string> {
  items: NavItem[];
  activeView: T;
  setView: (view: T) => void;
}

const BottomNavBar = <T extends string>({ items, activeView, setView }: BottomNavBarProps<T>) => {
  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      setView(item.id as T);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-t border-border shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const isActive = activeView === item.id;

          if (item.isCentral) {
            return (
              <div key={item.id} className="relative -top-5">
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-transform transform hover:scale-105",
                    isActive ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border"
                  )}
                >
                  <Icon className="w-8 h-8" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors w-16",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
