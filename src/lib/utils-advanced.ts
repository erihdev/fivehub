/**
 * Performance Utilities
 * أدوات لتحسين الأداء والسرعة
 */

// تحسين الصور - lazy loading
export const lazyLoadImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = reject;
        img.src = imageUrl;
    });
};

// Throttle - تحديد عدد مرات تنفيذ function
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

// Debounce - تأخير التنفيذ
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// تحسين الأداء - Memoization
export function memoize<T extends (...args: any[]) => any>(
    fn: T
): T {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

// تنسيق الأرقام العربية
export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ar-SA').format(num);
};

// تنسيق العملة
export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency,
    }).format(amount);
};

// تنسيق التاريخ بالعربي
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(d);
};

// تنسيق الوقت
export const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

// حساب المدة الزمنية النسبية (منذ كم...)
export const getRelativeTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDate(d);
};

// تقليص النص
export const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

// توليد ID عشوائي
export const generateId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// التحقق من رقم الجوال السعودي
export const isValidSaudiPhone = (phone: string): boolean => {
    return /^\+966\d{9}$/.test(phone);
};

// تنسيق رقم الجوال
export const formatPhoneNumber = (phone: string): string => {
    if (phone.startsWith('+966')) {
        return phone.replace(/(\+966)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    }
    return phone;
};

// حساب نسبة التقييم
export const calculateRating = (ratings: number[]): number => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
};

// تحويل الحجم بالبايتات إلى نص قابل للقراءة
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// التحقق من البريد الإلكتروني
export const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// تنظيف النص من HTML
export const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// حساب الوقت المتبقي
export const getTimeRemaining = (endDate: Date | string): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
} => {
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const total = end.getTime() - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds, total };
};

// Sleep utility (للـ async operations)
export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
