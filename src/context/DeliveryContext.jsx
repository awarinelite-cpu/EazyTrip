import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  listenToDelivery,
  listenToNearbyDeliveries,
  listenToRiderActiveDelivery,
} from "../firebase/firestore";

const DeliveryContext = createContext({});
export const useDelivery = () => useContext(DeliveryContext);

export const DeliveryProvider = ({ children }) => {
  const { currentUser, isRider, isSender } = useAuth();

  const [activeDelivery, setActiveDelivery]     = useState(null);
  const [nearbyRequests, setNearbyRequests]      = useState([]);
  const [trackingId, setTrackingId]              = useState(null);

  // Sender: watch a specific delivery they booked
  useEffect(() => {
    if (!trackingId) return;
    const unsub = listenToDelivery(trackingId, setActiveDelivery);
    return unsub;
  }, [trackingId]);

  // Rider: watch nearby open requests + own active delivery
  useEffect(() => {
    if (!currentUser || !isRider) return;
    const unsubNearby = listenToNearbyDeliveries(setNearbyRequests);
    const unsubActive = listenToRiderActiveDelivery(currentUser.uid, setActiveDelivery);
    return () => { unsubNearby(); unsubActive(); };
  }, [currentUser, isRider]);

  const startTracking = (deliveryId) => setTrackingId(deliveryId);
  const stopTracking  = () => { setTrackingId(null); setActiveDelivery(null); };

  return (
    <DeliveryContext.Provider value={{
      activeDelivery,
      nearbyRequests,
      trackingId,
      startTracking,
      stopTracking,
    }}>
      {children}
    </DeliveryContext.Provider>
  );
};
