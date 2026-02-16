import { z } from 'zod';

/**
 * مخططات التحقق من البيانات (Validation Schemas)
 * باستخدام Zod لضمان type safety وvalidation قوي
 */

// مخطط معلومات المستخدم
export const userSchema = z.object({
    name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    phone: z.string().regex(/^\+966\d{9}$/, 'رقم الجوال يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
    location: z.string().min(3, 'الموقع مطلوب'),
});

// مخطط الطلب
export const orderSchema = z.object({
    customerId: z.string().uuid('معرف العميل غير صحيح'),
    items: z.array(
        z.object({
            productId: z.string(),
            productName: z.string(),
            quantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
            price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
        })
    ).min(1, 'يجب إضافة منتج واحد على الأقل'),
    totalAmount: z.number().positive(),
    deliveryAddress: z.string().min(5, 'عنوان التوصيل مطلوب'),
    deliveryDate: z.date().min(new Date(), 'تاريخ التوصيل يجب أن يكون في المستقبل'),
    notes: z.string().optional(),
});

// مخطط المنتج
export const productSchema = z.object({
    name: z.string().min(2, 'اسم المنتج مطلوب'),
    description: z.string().min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل'),
    price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
    category: z.string().min(1, 'التصنيف مطلوب'),
    imageUrl: z.string().url('رابط الصورة غير صحيح').optional(),
    stock: z.number().nonnegative('المخزون لا يمكن أن يكون سالب'),
    providerId: z.string().uuid('معرف المزود غير صحيح'),
});

// مخطط المزود (Provider)
export const providerSchema = z.object({
    name: z.string().min(2, 'اسم المزود مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    phone: z.string().regex(/^\+966\d{9}$/, 'رقم الجوال غير صحيح'),
    businessName: z.string().min(2, 'اسم النشاط التجاري مطلوب'),
    businessLicense: z.string().min(5, 'رقم السجل التجاري مطلوب'),
    category: z.string().min(1, 'التصنيف مطلوب'),
    location: z.object({
        lat: z.number(),
        lng: z.number(),
        address: z.string(),
    }),
});

// مخطط تسجيل الدخول
export const loginSchema = z.object({
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

// مخطط التسجيل
export const registerSchema = z.object({
    name: z.string().min(2, 'الاسم مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    phone: z.string().regex(/^\+966\d{9}$/, 'رقم الجوال غير صحيح'),
    password: z.string()
        .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
        .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
        .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
        .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
});

// مخطط البحث
export const searchSchema = z.object({
    query: z.string().min(1, 'ادخل كلمة البحث'),
    category: z.string().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    location: z.string().optional(),
}).refine((data) => {
    if (data.minPrice && data.maxPrice) {
        return data.minPrice <= data.maxPrice;
    }
    return true;
}, {
    message: 'الحد الأدنى للسعر يجب أن يكون أقل من الحد الأقصى',
    path: ['maxPrice'],
});

// Types المستخرجة من المخططات
export type User = z.infer<typeof userSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Product = z.infer<typeof productSchema>;
export type Provider = z.infer<typeof providerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type SearchForm = z.infer<typeof searchSchema>;
