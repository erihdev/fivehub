import { useState, useEffect, useCallback } from 'react';

/**
 * Advanced GPS/Geolocation Hook
 * نظام GPS متقدم مع دقة عالية وتتبع مستمر
 */

export interface GeolocationPosition {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

export interface GeolocationError {
    code: number;
    message: string;
}

export interface UseGPSOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    watch?: boolean; // تتبع مستمر
    onError?: (error: GeolocationError) => void;
    onSuccess?: (position: GeolocationPosition) => void;
}

export function useGPS(options: UseGPSOptions = {}) {
    const {
        enableHighAccuracy = true, // دقة عالية افتراضياً
        timeout = 10000,           // 10 ثواني
        maximumAge = 0,            // لا نريد بيانات قديمة
        watch = false,
        onError,
        onSuccess,
    } = options;

    const [position, setPosition] = useState<GeolocationPosition | null>(null);
    const [error, setError] = useState<GeolocationError | null>(null);
    const [loading, setLoading] = useState(false);
    const [supported, setSupported] = useState(false);

    // التحقق من الدعم
    useEffect(() => {
        setSupported('geolocation' in navigator);
    }, []);

    // معالجة النجاح
    const handleSuccess = useCallback((pos: GeolocationPosition) => {
        const locationData: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
        };

        setPosition(locationData);
        setError(null);
        setLoading(false);
        onSuccess?.(locationData);
    }, [onSuccess]);

    // معالجة الخطأ
    const handleError = useCallback((err: GeolocationPositionError) => {
        const errorData: GeolocationError = {
            code: err.code,
            message: err.message,
        };

        setError(errorData);
        setLoading(false);
        onError?.(errorData);
    }, [onError]);

    // الحصول على الموقع مرة واحدة
    const getCurrentPosition = useCallback(() => {
        if (!supported) {
            setError({
                code: 0,
                message: 'Geolocation غير مدعوم في هذا المتصفح',
            });
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy,
                timeout,
                maximumAge,
            }
        );
    }, [supported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

    // التتبع المستمر
    useEffect(() => {
        if (!watch || !supported) return;

        setLoading(true);
        const watchId = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy,
                timeout,
                maximumAge,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [watch, supported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

    return {
        position,
        error,
        loading,
        supported,
        getCurrentPosition,
        // Utility helpers
        getDistanceTo: (lat2: number, lon2: number) => {
            if (!position) return null;
            return calculateDistance(
                position.latitude,
                position.longitude,
                lat2,
                lon2
            );
        },
        getAddressFromCoords: async () => {
            if (!position) return null;
            return await reverseGeocode(position.latitude, position.longitude);
        },
    };
}

/**
 * حساب المسافة بين نقطتين (Haversine formula)
 * النتيجة بالكيلومتر
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // دقة خانتين عشريتين
}

function toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Reverse Geocoding - تحويل الإحداثيات إلى عنوان
 * يستخدم Google Maps Geocoding API
 */
export async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<string | null> {
    try {
        // يمكنك استخدام Google Maps API أو أي خدمة أخرى
        // هذا مثال باستخدام Nominatim (مجاني)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`
        );

        if (!response.ok) {
            throw new Error('فشل في الحصول على العنوان');
        }

        const data = await response.json();
        return data.display_name || null;
    } catch (error) {
        console.error('خطأ في reverse geocoding:', error);
        return null;
    }
}

/**
 * التحقق من الأذونات
 */
export async function checkGeolocationPermission(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
        return 'prompt';
    }

    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch {
        return 'prompt';
    }
}

/**
 * طلب الأذونات
 */
export async function requestGeolocationPermission(): Promise<boolean> {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { enableHighAccuracy: false, timeout: 1000 }
        );
    });
}
