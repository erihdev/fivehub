import { useCoffeeRealtimeNotifications } from '@/hooks/useCoffeeRealtimeNotifications';
import { useInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { useSupplierOffersNotifications } from '@/hooks/useSupplierOffersNotifications';
import { useFavoriteOfferExpiryAlerts } from '@/hooks/useFavoriteOfferExpiryAlerts';
import { useCommissionNotifications } from '@/hooks/useCommissionNotifications';
import { useCommissionStatusNotifications } from '@/hooks/useCommissionStatusNotifications';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

const RealtimeNotifications = () => {
  useCoffeeRealtimeNotifications();
  useInventoryAlerts();
  useSupplierOffersNotifications();
  useFavoriteOfferExpiryAlerts();
  useCommissionNotifications();
  useCommissionStatusNotifications();
  useAdminNotifications();
  return null;
};

export default RealtimeNotifications;
