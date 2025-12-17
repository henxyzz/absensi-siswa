import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "./queryClient";

export type GeolocationPermissionStatus = "prompt" | "granted" | "denied" | "unsupported";
export type TrackingStatus = "idle" | "requesting" | "tracking" | "error" | "stopped";

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  permissionStatus: GeolocationPermissionStatus;
  trackingStatus: TrackingStatus;
  lastUpdateTime: Date | null;
  isWithinRadius: boolean | null;
}

interface UseGeolocationOptions {
  leaveRequestId?: string;
  enabled?: boolean;
  updateInterval?: number;
}

const TRACKING_INTERVAL = 30000;

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { leaveRequestId, enabled = false, updateInterval = TRACKING_INTERVAL } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    permissionStatus: "prompt",
    trackingStatus: "idle",
    lastUpdateTime: null,
    isWithinRadius: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        permissionStatus: "unsupported",
        error: "Geolocation tidak didukung oleh browser ini",
      }));
      return "unsupported";
    }

    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        const status = result.state as GeolocationPermissionStatus;
        setState((prev) => ({ ...prev, permissionStatus: status }));
        
        result.addEventListener("change", () => {
          setState((prev) => ({
            ...prev,
            permissionStatus: result.state as GeolocationPermissionStatus,
          }));
        });
        
        return status;
      } catch {
        return "prompt";
      }
    }
    return "prompt";
  }, []);

  const sendLocationToServer = useCallback(
    async (position: GeolocationPosition) => {
      if (!leaveRequestId) return;

      const now = Date.now();
      if (now - lastSentRef.current < updateInterval - 1000) {
        return;
      }
      lastSentRef.current = now;

      try {
        const response = await apiRequest("POST", "/api/location-logs", {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          leaveRequestId,
        });

        const data = await response.json();
        
        setState((prev) => ({
          ...prev,
          lastUpdateTime: new Date(),
          isWithinRadius: data.isWithinRadius ?? null,
          error: null,
        }));
      } catch (error) {
        console.error("Failed to send location:", error);
        setState((prev) => ({
          ...prev,
          error: "Gagal mengirim lokasi ke server",
        }));
      }
    },
    [leaveRequestId, updateInterval]
  );

  const handlePositionSuccess = useCallback(
    (geoPosition: GeolocationPosition) => {
      const position: GeolocationPosition = {
        latitude: geoPosition.latitude,
        longitude: geoPosition.longitude,
        accuracy: geoPosition.accuracy,
        timestamp: geoPosition.timestamp,
      };

      setState((prev) => ({
        ...prev,
        position,
        error: null,
        trackingStatus: "tracking",
        permissionStatus: "granted",
      }));

      sendLocationToServer(position);
    },
    [sendLocationToServer]
  );

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let errorMessage: string;
    let permissionStatus: GeolocationPermissionStatus = "prompt";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser.";
        permissionStatus = "denied";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Posisi tidak tersedia. Pastikan GPS aktif.";
        break;
      case error.TIMEOUT:
        errorMessage = "Waktu habis saat mencari lokasi. Coba lagi.";
        break;
      default:
        errorMessage = "Terjadi kesalahan saat mendapatkan lokasi.";
    }

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      trackingStatus: "error",
      permissionStatus,
    }));
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation tidak didukung oleh browser ini",
        trackingStatus: "error",
        permissionStatus: "unsupported",
      }));
      return;
    }

    setState((prev) => ({ ...prev, trackingStatus: "requesting" }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position: GeolocationPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        handlePositionSuccess(position);
      },
      handlePositionError,
      geoOptions
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position: GeolocationPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        handlePositionSuccess(position);
      },
      handlePositionError,
      geoOptions
    );

    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          sendLocationToServer(position);
        },
        handlePositionError,
        geoOptions
      );
    }, updateInterval);
  }, [handlePositionSuccess, handlePositionError, sendLocationToServer, updateInterval]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setState((prev) => ({ ...prev, trackingStatus: "stopped" }));
  }, []);

  const requestPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, trackingStatus: "requesting" }));

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setState((prev) => ({
            ...prev,
            permissionStatus: "granted",
            trackingStatus: "idle",
          }));
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setState((prev) => ({
              ...prev,
              permissionStatus: "denied",
              trackingStatus: "error",
              error: "Izin lokasi ditolak",
            }));
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    if (enabled && leaveRequestId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, leaveRequestId, startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    requestPermission,
    checkPermission,
  };
}

export function GeolocationStatusBadge({
  trackingStatus,
  permissionStatus,
  lastUpdateTime,
  isWithinRadius,
  error,
}: {
  trackingStatus: TrackingStatus;
  permissionStatus: GeolocationPermissionStatus;
  lastUpdateTime: Date | null;
  isWithinRadius: boolean | null;
  error: string | null;
}) {
  const getStatusText = () => {
    switch (trackingStatus) {
      case "tracking":
        return isWithinRadius === false ? "Di luar radius" : "Pelacakan aktif";
      case "requesting":
        return "Meminta izin...";
      case "error":
        return error || "Terjadi kesalahan";
      case "stopped":
        return "Pelacakan berhenti";
      default:
        return "Tidak aktif";
    }
  };

  const getStatusColor = () => {
    if (trackingStatus === "tracking") {
      return isWithinRadius === false ? "bg-rose-500" : "bg-emerald-500";
    }
    if (trackingStatus === "requesting") return "bg-amber-500";
    if (trackingStatus === "error") return "bg-rose-500";
    return "bg-gray-500";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${trackingStatus === "tracking" ? "animate-pulse" : ""}`} />
      <span className="text-muted-foreground">{getStatusText()}</span>
      {lastUpdateTime && trackingStatus === "tracking" && (
        <span className="text-xs text-muted-foreground/70">
          (Update: {formatTime(lastUpdateTime)})
        </span>
      )}
    </div>
  );
}
