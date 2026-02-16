import * as React from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.suppliers': 'الموردين',
    'nav.dashboard': 'لوحة التحكم',
    'nav.compare': 'مقارنة',
    'nav.inventory': 'المخزون',
    'nav.cupping': 'التحميص',
    'nav.favorites': 'المفضلة',
    'nav.orders': 'الطلبات',
    'nav.calculator': 'حاسبة التكلفة',
    'nav.roastProfiles': 'ملفات التحميص',
    'nav.harvestCalendar': 'تقويم الحصاد',
    'nav.profitCalculator': 'حاسبة الأرباح',
    'nav.originMap': 'خريطة المنشأ',
    'nav.profile': 'الملف الشخصي',
    'nav.login': 'تسجيل الدخول',
    'nav.logout': 'تسجيل الخروج',
    
    // Brand
    'brand.name': 'دال',
    
    // Hero Section
    'hero.title': 'دال للقهوة المختصة',
    'hero.subtitle': 'منصة ذكية لإدارة موردي البن الأخضر',
    'hero.description': 'استخرج بيانات المحاصيل من ملفات الموردين بالذكاء الاصطناعي، قارن الأسعار والجودة، وأدر علاقاتك مع الموردين بكفاءة',
    'hero.cta': 'ابدأ الآن',
    'hero.explore': 'استكشف المزيد',
    
    // Upload Section
    'upload.title': 'ارفع قائمة المورد',
    'upload.subtitle': 'ارفع ملف نصي أو PDF من المورد وسنقوم بتحليله بالذكاء الاصطناعي واستخراج جميع المحاصيل والأسعار تلقائياً',
    'upload.supplierName': 'اسم المورد',
    'upload.supplierPlaceholder': 'مثال: شركة البن الذهبي',
    'upload.fileTab': 'رفع ملف',
    'upload.pasteTab': 'لصق النص',
    'upload.dropzone': 'اسحب ملف هنا أو انقر للاختيار',
    'upload.dropzoneHint': 'PDF أو ملف نصي - سيتم تحليله بالذكاء الاصطناعي',
    'upload.pasteLabel': 'الصق محتوى قائمة المورد هنا',
    'upload.pastePlaceholder': 'الصق هنا محتوى قائمة المورد (الأسماء، الأسعار، المنشأ، المعالجة، النكهات...)',
    'upload.pasteHint': 'يمكنك نسخ المحتوى من ملف PDF أو Excel أو أي مصدر آخر ولصقه هنا',
    'upload.analyzeBtn': 'تحليل بالذكاء الاصطناعي',
    'upload.analyzing': 'جاري التحليل...',
    'upload.removeFile': 'إزالة الملف',
    'upload.preview': 'معاينة الملف',
    'upload.hidePreview': 'إخفاء المعاينة',
    'upload.smartAnalysis': 'تحليل ذكي للملفات',
    'upload.smartAnalysisDesc': 'ادعم صيغة PDF والملفات النصية - سيتم تحليل المحتوى واستخراج البيانات تلقائياً',
    'upload.loginRequired': 'يجب تسجيل الدخول لرفع الملفات',
    'upload.loginPrompt': 'سجل دخولك لرفع وتحليل قوائم الموردين',
    'upload.extracted': 'تم استخراج النص من',
    'upload.pages': 'صفحات - جاهز للتحليل',
    'upload.missingData': 'بيانات ناقصة',
    'upload.missingDataDesc': 'يرجى إدخال اسم المورد واختيار ملف',
    'upload.missingTextDesc': 'يرجى إدخال اسم المورد ولصق محتوى القائمة',
    'upload.processing': 'جاري المعالجة',
    'upload.analyzingContent': 'يتم تحليل المحتوى...',
    'upload.aiAnalyzing': 'جاري التحليل بالذكاء الاصطناعي',
    'upload.extractingData': 'يتم استخراج بيانات المحاصيل...',
    'upload.success': 'تم التحليل بنجاح!',
    'upload.extractedCount': 'تم استخراج {count} محصول من الملف',
    'upload.noData': 'لا توجد بيانات',
    'upload.noDataFound': 'لم يتم العثور على محاصيل في الملف',
    'upload.error': 'خطأ',
    'upload.processingError': 'حدث خطأ أثناء معالجة الملف',
    'upload.supplierError': 'فشل في إنشاء المورد',
    'upload.analysisError': 'خطأ في التحليل',
    'upload.invalidFileType': 'نوع ملف غير صالح',
    'upload.invalidFileTypeDesc': 'يرجى رفع ملف PDF أو نص',
    
    // Search Section
    'search.title': 'ابحث عن القهوة المثالية',
    'search.subtitle': 'ابحث بين جميع المحاصيل المتوفرة من مختلف الموردين وقارن الأسعار',
    'search.placeholder': 'ابحث عن نوع القهوة، البلد، أو المورد...',
    'search.country': 'البلد:',
    'search.process': 'المعالجة:',
    'search.all': 'الكل',
    'search.washed': 'مغسول',
    'search.natural': 'طبيعي',
    'search.honey': 'عسلي',
    'search.showing': 'عرض',
    'search.of': 'من',
    'search.crops': 'محصول',
    'search.noCrops': 'لا توجد محاصيل مسجلة',
    'search.uploadHint': 'ارفع ملف PDF من أحد الموردين لإضافة المحاصيل',
    'search.noResults': 'لا توجد نتائج مطابقة للبحث',
    'search.moreDetails': 'تفاصيل أكثر',
    'search.unknownSupplier': 'مورد غير محدد',
    'search.score': 'درجة',
    'search.flavors': 'النكهات',
    
    // Stats
    'stats.suppliers': 'مورد مسجل',
    'stats.coffees': 'محصول متوفر',
    'stats.origins': 'بلد منشأ',
    'stats.systemActive': 'فعّال',
    'stats.systemReady': 'جاهز',
    'stats.systemStatus': 'حالة النظام',
    'stats.totalSuppliers': 'إجمالي الموردين',
    'stats.totalCrops': 'إجمالي المحاصيل',
    'stats.available': 'متوفر',
    'stats.avgPrice': 'متوسط السعر',
    'stats.avgScore': 'متوسط الدرجة',
    'stats.originCountries': 'بلد منشأ',
    'stats.lastAdded': 'آخر إضافة',
    
    // Suppliers Page
    'suppliers.title': 'إدارة الموردين',
    'suppliers.subtitle': 'عرض وإدارة جميع موردي البن الأخضر المسجلين',
    'suppliers.addNew': 'إضافة مورد جديد',
    'suppliers.search': 'ابحث عن مورد...',
    'suppliers.noSuppliers': 'لا يوجد موردين مسجلين',
    'suppliers.startAdding': 'ابدأ بإضافة مورد جديد عن طريق رفع ملف PDF',
    'suppliers.addSupplier': 'إضافة مورد',
    'suppliers.addedOn': 'أُضيف في',
    'suppliers.crop': 'محصول',
    
    // Dashboard Page
    'dashboard.title': 'لوحة التحكم',
    'dashboard.subtitle': 'نظرة عامة على جميع الموردين والمحاصيل',
    'dashboard.supplier': 'مورد',
    'dashboard.crop': 'محصول',
    'dashboard.cropsPerSupplier': 'المحاصيل حسب المورد',
    'dashboard.cropsPerSupplierDesc': 'عدد المحاصيل لكل مورد',
    'dashboard.cropsPerOrigin': 'المحاصيل حسب بلد المنشأ',
    'dashboard.cropsPerOriginDesc': 'توزيع المحاصيل على البلدان',
    'dashboard.noData': 'لا توجد بيانات',
    'dashboard.processMethods': 'طرق المعالجة',
    'dashboard.processMethodsDesc': 'أكثر طرق المعالجة شيوعاً',
    'dashboard.recentSuppliers': 'آخر الموردين',
    'dashboard.recentSuppliersDesc': 'آخر الموردين المضافين',
    'dashboard.noSuppliers': 'لا يوجد موردين',
    'dashboard.undefined': 'غير محدد',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.sort': 'ترتيب',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.confirm': 'تأكيد',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.viewAll': 'عرض الكل',
    'common.mb': 'ميجابايت',
    'common.kg': 'كجم',
    'common.sar': 'ر.س',
    'common.usd': 'دولار',
    
    // Coffee attributes
    'coffee.name': 'الاسم',
    'coffee.origin': 'المنشأ',
    'coffee.region': 'المنطقة',
    'coffee.process': 'المعالجة',
    'coffee.price': 'السعر',
    'coffee.score': 'التقييم',
    'coffee.altitude': 'الارتفاع',
    'coffee.variety': 'الصنف',
    'coffee.flavor': 'النكهات',
    'coffee.available': 'متوفر',
    'coffee.unavailable': 'غير متوفر',
    'coffee.soon': 'قريباً',
    
    // Footer
    'footer.description': 'منصة إدارة موردي البن الأخضر للمحامص المختصة في المملكة العربية السعودية',
    'footer.rights': 'جميع الحقوق محفوظة',
    
    // Theme
    'darkMode': 'الوضع الداكن',
    'lightMode': 'الوضع الفاتح',
    
    // Language
    'language.switch': 'English',
    'language.ar': 'العربية',
    'language.en': 'English',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.suppliers': 'Suppliers',
    'nav.dashboard': 'Dashboard',
    'nav.compare': 'Compare',
    'nav.inventory': 'Inventory',
    'nav.cupping': 'Roasting',
    'nav.favorites': 'Favorites',
    'nav.orders': 'Orders',
    'nav.calculator': 'Cost Calculator',
    'nav.roastProfiles': 'Roast Profiles',
    'nav.harvestCalendar': 'Harvest Calendar',
    'nav.profitCalculator': 'Profit Calculator',
    'nav.originMap': 'Origin Map',
    'nav.profile': 'Profile',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    
    // Brand
    'brand.name': 'Dal',
    
    // Hero Section
    'hero.title': 'Dal Specialty Coffee',
    'hero.subtitle': 'Smart Platform for Green Coffee Supplier Management',
    'hero.description': 'Extract crop data from supplier files using AI, compare prices and quality, and manage your supplier relationships efficiently',
    'hero.cta': 'Get Started',
    'hero.explore': 'Explore More',
    
    // Upload Section
    'upload.title': 'Upload Supplier List',
    'upload.subtitle': 'Upload a text or PDF file from the supplier and we will analyze it with AI to extract all crops and prices automatically',
    'upload.supplierName': 'Supplier Name',
    'upload.supplierPlaceholder': 'Example: Golden Bean Company',
    'upload.fileTab': 'Upload File',
    'upload.pasteTab': 'Paste Text',
    'upload.dropzone': 'Drag a file here or click to select',
    'upload.dropzoneHint': 'PDF or text file - will be analyzed by AI',
    'upload.pasteLabel': 'Paste supplier list content here',
    'upload.pastePlaceholder': 'Paste supplier list content here (names, prices, origin, process, flavors...)',
    'upload.pasteHint': 'You can copy content from PDF, Excel, or any other source and paste it here',
    'upload.analyzeBtn': 'Analyze with AI',
    'upload.analyzing': 'Analyzing...',
    'upload.removeFile': 'Remove File',
    'upload.preview': 'Preview File',
    'upload.hidePreview': 'Hide Preview',
    'upload.smartAnalysis': 'Smart File Analysis',
    'upload.smartAnalysisDesc': 'Supports PDF and text files - content will be analyzed and data extracted automatically',
    'upload.loginRequired': 'Login required to upload files',
    'upload.loginPrompt': 'Login to upload and analyze supplier lists',
    'upload.extracted': 'Extracted text from',
    'upload.pages': 'pages - ready for analysis',
    'upload.missingData': 'Missing Data',
    'upload.missingDataDesc': 'Please enter supplier name and select a file',
    'upload.missingTextDesc': 'Please enter supplier name and paste list content',
    'upload.processing': 'Processing',
    'upload.analyzingContent': 'Analyzing content...',
    'upload.aiAnalyzing': 'AI Analysis in Progress',
    'upload.extractingData': 'Extracting crop data...',
    'upload.success': 'Analysis Successful!',
    'upload.extractedCount': 'Extracted {count} crops from file',
    'upload.noData': 'No Data',
    'upload.noDataFound': 'No crops found in file',
    'upload.error': 'Error',
    'upload.processingError': 'Error processing file',
    'upload.supplierError': 'Failed to create supplier',
    'upload.analysisError': 'Analysis Error',
    'upload.invalidFileType': 'Invalid File Type',
    'upload.invalidFileTypeDesc': 'Please upload a PDF or text file',
    
    // Search Section
    'search.title': 'Find the Perfect Coffee',
    'search.subtitle': 'Search among all available crops from different suppliers and compare prices',
    'search.placeholder': 'Search by coffee type, country, or supplier...',
    'search.country': 'Country:',
    'search.process': 'Process:',
    'search.all': 'All',
    'search.washed': 'Washed',
    'search.natural': 'Natural',
    'search.honey': 'Honey',
    'search.showing': 'Showing',
    'search.of': 'of',
    'search.crops': 'crops',
    'search.noCrops': 'No crops registered',
    'search.uploadHint': 'Upload a PDF file from a supplier to add crops',
    'search.noResults': 'No matching results found',
    'search.moreDetails': 'More Details',
    'search.unknownSupplier': 'Unknown Supplier',
    'search.score': 'Score',
    'search.flavors': 'Flavors',
    
    // Stats
    'stats.suppliers': 'Registered Suppliers',
    'stats.coffees': 'Available Crops',
    'stats.origins': 'Origin Countries',
    'stats.systemActive': 'Active',
    'stats.systemReady': 'Ready',
    'stats.systemStatus': 'System Status',
    'stats.totalSuppliers': 'Total Suppliers',
    'stats.totalCrops': 'Total Crops',
    'stats.available': 'Available',
    'stats.avgPrice': 'Avg Price',
    'stats.avgScore': 'Avg Score',
    'stats.originCountries': 'Origin Countries',
    'stats.lastAdded': 'Last Added',
    
    // Suppliers Page
    'suppliers.title': 'Supplier Management',
    'suppliers.subtitle': 'View and manage all registered green coffee suppliers',
    'suppliers.addNew': 'Add New Supplier',
    'suppliers.search': 'Search for supplier...',
    'suppliers.noSuppliers': 'No registered suppliers',
    'suppliers.startAdding': 'Start by adding a new supplier by uploading a PDF file',
    'suppliers.addSupplier': 'Add Supplier',
    'suppliers.addedOn': 'Added on',
    'suppliers.crop': 'crop',
    
    // Dashboard Page
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of all suppliers and crops',
    'dashboard.supplier': 'Supplier',
    'dashboard.crop': 'Crop',
    'dashboard.cropsPerSupplier': 'Crops per Supplier',
    'dashboard.cropsPerSupplierDesc': 'Number of crops per supplier',
    'dashboard.cropsPerOrigin': 'Crops by Origin Country',
    'dashboard.cropsPerOriginDesc': 'Distribution of crops by country',
    'dashboard.noData': 'No data available',
    'dashboard.processMethods': 'Processing Methods',
    'dashboard.processMethodsDesc': 'Most common processing methods',
    'dashboard.recentSuppliers': 'Recent Suppliers',
    'dashboard.recentSuppliersDesc': 'Recently added suppliers',
    'dashboard.noSuppliers': 'No suppliers',
    'dashboard.undefined': 'Undefined',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.viewAll': 'View All',
    'common.mb': 'MB',
    'common.kg': 'kg',
    'common.sar': 'SAR',
    'common.usd': 'USD',
    
    // Coffee attributes
    'coffee.name': 'Name',
    'coffee.origin': 'Origin',
    'coffee.region': 'Region',
    'coffee.process': 'Process',
    'coffee.price': 'Price',
    'coffee.score': 'Score',
    'coffee.altitude': 'Altitude',
    'coffee.variety': 'Variety',
    'coffee.flavor': 'Flavors',
    'coffee.available': 'Available',
    'coffee.unavailable': 'Unavailable',
    'coffee.soon': 'Coming Soon',
    
    // Footer
    'footer.description': 'Green coffee supplier management platform for specialty roasters in Saudi Arabia',
    'footer.rights': 'All rights reserved',
    
    // Theme
    'darkMode': 'Dark Mode',
    'lightMode': 'Light Mode',
    
    // Language
    'language.switch': 'العربية',
    'language.ar': 'العربية',
    'language.en': 'English',
  }
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = React.useState<Language>('ar');

  // Safe initialization after mount
  React.useEffect(() => {
    const saved = localStorage.getItem('dal-language');
    if (saved === 'en' || saved === 'ar') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dal-language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  React.useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    // Provide default fallback during initial render to prevent crashes
    return {
      language: 'ar',
      setLanguage: () => {},
      t: (key: string) => key,
      dir: 'rtl'
    };
  }
  return context;
};
