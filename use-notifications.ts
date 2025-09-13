import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationData {
  id: string;
  type: 'buy_signal_match' | 'price_drop' | 'new_seller' | 'order_update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  // Simulate checking for new notifications
  useEffect(() => {
    const checkForNotifications = async () => {
      try {
        // This would be a real API call in production
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: NotificationData) => !n.read).length);
        }
      } catch (error) {
        // Silently handle - notifications are not critical
        console.debug('Notifications not available');
      }
    };

    // Check immediately and then every 2 minutes
    checkForNotifications();
    const interval = setInterval(checkForNotifications, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const showNotificationToast = (notification: NotificationData) => {
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'price_drop' ? 'default' : 'default',
    });
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    showNotificationToast
  };
}