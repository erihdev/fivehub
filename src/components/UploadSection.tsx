import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, Loader2, Sparkles, LogIn, ClipboardPaste, AlertTriangle, Coffee, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedOffering {
  name: string;
  origin?: string;
  region?: string;
  process?: string;
  price?: number;
  currency?: string;
  score?: number;
  altitude?: string;
  variety?: string;
  flavor?: string;
  available?: boolean;
}

type ProcessingStage = 'idle' | 'preparing' | 'uploading' | 'analyzing' | 'saving' | 'complete';

const UploadSection = () => {
  const { user } = useAuth();
  const { language, t, dir } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedOffering[] | null>(null);
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [limitPages, setLimitPages] = useState(true);
  
  // Auto-set supplier name from user account
  const supplierName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  
  // Existing supplier state
  const [existingSupplier, setExistingSupplier] = useState<{ id: string; name: string } | null>(null);
  const [existingCoffees, setExistingCoffees] = useState<{ name: string; origin: string | null }[]>([]);
  const [showExistingCoffees, setShowExistingCoffees] = useState(false);
  const [isCheckingSupplier, setIsCheckingSupplier] = useState(false);

  const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  const { toast } = useToast();
  
  const isRtl = dir === 'rtl';
  const iconMargin = isRtl ? 'ml-2' : 'mr-2';

  // Check for existing supplier when name changes
  const checkExistingSupplier = useCallback(async (name: string) => {
    if (!name.trim() || !user) {
      setExistingSupplier(null);
      setExistingCoffees([]);
      return;
    }

    setIsCheckingSupplier(true);
    try {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("name", name.trim())
        .eq("user_id", user.id)
        .maybeSingle();

      if (supplier) {
        setExistingSupplier(supplier);
        // Fetch existing coffees for this supplier
        const { data: coffees } = await supabase
          .from("coffee_offerings")
          .select("name, origin")
          .eq("supplier_id", supplier.id)
          .order("name");
        
        setExistingCoffees(coffees || []);
      } else {
        setExistingSupplier(null);
        setExistingCoffees([]);
      }
    } catch (error) {
      console.error("Error checking supplier:", error);
    } finally {
      setIsCheckingSupplier(false);
    }
  }, [user]);

  // Debounce supplier name check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkExistingSupplier(supplierName);
    }, 500);

    return () => clearTimeout(timer);
  }, [supplierName, checkExistingSupplier]);

  // Progress animation effect - must be before any conditional returns
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      setProcessingStage('idle');
      return;
    }

    const stages: { stage: ProcessingStage; target: number; duration: number }[] = [
      { stage: 'preparing', target: 15, duration: 500 },
      { stage: 'uploading', target: 30, duration: 1000 },
      { stage: 'analyzing', target: 85, duration: 8000 },
      { stage: 'saving', target: 95, duration: 500 },
    ];

    let currentStageIndex = 0;
    let animationFrame: number;
    let startTime: number;
    let startProgress = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const currentStage = stages[currentStageIndex];

      if (!currentStage) return;

      const stageProgress = Math.min(elapsed / currentStage.duration, 1);
      const newProgress = startProgress + (currentStage.target - startProgress) * stageProgress;
      
      setProgress(newProgress);
      setProcessingStage(currentStage.stage);

      if (stageProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else if (currentStageIndex < stages.length - 1) {
        currentStageIndex++;
        startTime = 0;
        startProgress = currentStage.target;
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isProcessing, language]);

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <section id="upload" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              {t('upload.title')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('upload.loginPrompt')}
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <Card variant="coffee" className="text-center py-12">
              <CardContent>
                <LogIn className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-4">
                  {t('upload.loginRequired')}
                </p>
                <Link to="/auth">
                  <Button variant="coffee" size="lg">
                    <LogIn className={`w-5 h-5 ${iconMargin}`} />
                    {t('nav.login')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.type === "text/plain") {
        setFile(droppedFile);
        setExtractedData(null);
        setIsLargeFile(droppedFile.size > LARGE_FILE_THRESHOLD);
      } else {
        toast({
          title: "نوع ملف غير صالح",
          description: "يرجى رفع ملف PDF أو نص",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setExtractedData(null);
      setIsLargeFile(selectedFile.size > LARGE_FILE_THRESHOLD);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text files, read directly
    if (file.type === "text/plain") {
      return await file.text();
    }
    
    // For PDF files, convert to base64 and let AI extract text
    // This is a simpler approach that works with the AI model
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );
    
    // Return a placeholder - the AI will handle PDF content extraction
    return `[PDF File: ${file.name}]\n\nPlease analyze this PDF content and extract coffee offerings data. The file has been uploaded for processing.`;
  };

  const getStageLabel = (stage: ProcessingStage): string => {
    const labels = {
      idle: '',
      preparing: language === 'ar' ? 'تحضير الملف...' : 'Preparing file...',
      uploading: language === 'ar' ? 'رفع الملف...' : 'Uploading file...',
      analyzing: language === 'ar' ? 'تحليل المحتوى بالذكاء الاصطناعي...' : 'Analyzing with AI...',
      saving: language === 'ar' ? 'حفظ البيانات...' : 'Saving data...',
      complete: language === 'ar' ? 'اكتمل!' : 'Complete!',
    };
    return labels[stage];
  };

  const handleUpload = async () => {
    const hasContent = inputMode === "file" ? !!file : !!pastedText.trim();
    
    if (!hasContent || !supplierName) {
      toast({
        title: t('upload.missingData'),
        description: inputMode === "file" 
          ? t('upload.missingDataDesc')
          : t('upload.missingTextDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setExtractedData(null);
    setProgress(0);

    try {
      // Get content based on input mode
      let fileContent = "";
      let isPdfFile = false;
      
      if (inputMode === "paste") {
        fileContent = pastedText;
      } else if (file) {
        if (file.type === "text/plain") {
          fileContent = await file.text();
        } else if (file.type === "application/pdf") {
          isPdfFile = true;
          // Convert PDF to base64 for AI processing
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          fileContent = base64;
        }
      }

      // Check if supplier already exists for this user
      const { data: existingSupplier } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("name", supplierName.trim())
        .eq("user_id", user.id)
        .maybeSingle();

      let supplierId: string;
      let isExistingSupplier = false;

      if (existingSupplier) {
        // Supplier exists, use existing one
        supplierId = existingSupplier.id;
        isExistingSupplier = true;
        toast({
          title: language === 'ar' ? "المورد موجود" : "Supplier exists",
          description: language === 'ar' 
            ? `سيتم إضافة القهوة الجديدة للمورد "${supplierName}"` 
            : `New coffees will be added to "${supplierName}"`,
        });
      } else {
        // Create new supplier
        const { data: supplierData, error: supplierError } = await supabase
          .from("suppliers")
          .insert({ name: supplierName.trim(), user_id: user.id })
          .select()
          .single();

        if (supplierError) {
          console.error("Supplier creation error:", supplierError);
          toast({
            title: language === 'ar' ? "خطأ" : "Error",
            description: language === 'ar' ? "فشل في إنشاء المورد" : "Failed to create supplier",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        supplierId = supplierData.id;
      }

      // Call AI analysis edge function with language
      const { data, error } = await supabase.functions.invoke("analyze-pdf", {
        body: {
          pdfContent: fileContent,
          supplierName: supplierName,
          supplierId: supplierId,
          isPdf: isPdfFile,
          language: language,
          limitPages: isLargeFile ? limitPages : false,
          maxPages: 50,
          checkDuplicates: isExistingSupplier,
        },
      });

      if (error) {
        console.error("Analysis error:", error);
        
        // Check for credits exhausted error
        let errorTitle = language === 'ar' ? "خطأ في التحليل" : "Analysis error";
        let errorDesc = error.message || (language === 'ar' ? "فشل في تحليل الملف" : "Failed to analyze file");
        
        if (error.message?.includes("402") || error.message?.includes("CREDITS_EXHAUSTED") || error.message?.includes("Payment")) {
          errorTitle = language === 'ar' ? "نفاد رصيد الذكاء الاصطناعي" : "AI Credits Exhausted";
          errorDesc = language === 'ar' 
            ? "نفاد رصيد الذكاء الاصطناعي. يرجى التواصل مع الدعم أو المحاولة لاحقاً." 
            : "AI credits exhausted. Please contact support or try again later.";
        }
        
        toast({
          title: errorTitle,
          description: errorDesc,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Complete progress
      setProgress(100);
      setProcessingStage('complete');

      if (data.offerings && data.offerings.length > 0) {
        const duplicateCount = data.duplicatesSkipped || 0;
        const addedCount = data.offerings.length;
        
        setExtractedData(data.offerings);
        
        let description = language === 'ar' 
          ? `تم استخراج ${addedCount} محصول` 
          : `Extracted ${addedCount} offerings`;
        
        if (data.chunksProcessed > 1) {
          description += language === 'ar' 
            ? ` (من ${data.chunksProcessed} أجزاء)` 
            : ` (from ${data.chunksProcessed} chunks)`;
        }
        
        if (duplicateCount > 0) {
          description += language === 'ar' 
            ? ` - تم تخطي ${duplicateCount} قهوة موجودة مسبقاً` 
            : ` - skipped ${duplicateCount} existing coffees`;
        }
        
        toast({
          title: language === 'ar' ? "تم التحليل بنجاح!" : "Analysis complete!",
          description,
        });
      } else if (data.duplicatesSkipped && data.duplicatesSkipped > 0) {
        toast({
          title: language === 'ar' ? "جميع القهوة موجودة" : "All coffees exist",
          description: language === 'ar' 
            ? `جميع المحاصيل (${data.duplicatesSkipped}) موجودة مسبقاً لهذا المورد` 
            : `All offerings (${data.duplicatesSkipped}) already exist for this supplier`,
        });
      } else {
        toast({
          title: language === 'ar' ? "لا توجد بيانات" : "No data found",
          description: language === 'ar' ? "لم يتم العثور على محاصيل في الملف" : "No offerings found in the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الملف",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPastedText("");
    setExtractedData(null);
    setProgress(0);
    setProcessingStage('idle');
    setIsLargeFile(false);
    setExistingSupplier(null);
    setExistingCoffees([]);
    setShowExistingCoffees(false);
  };

  return (
    <section id="upload" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t('upload.title')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('upload.subtitle')}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card variant="coffee">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-coffee-gold" />
                {t('upload.smartAnalysis')}
              </CardTitle>
              <CardDescription>
                {t('upload.smartAnalysisDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Supplier Name Display */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'اسم المورد:' : 'Supplier:'}
                  </span>
                  <span className="font-medium text-foreground">{supplierName}</span>
                </div>
                
                {/* Existing Supplier Notice */}
                {existingSupplier && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Coffee className="w-5 h-5" />
                        <span className="font-medium">
                          {language === 'ar' 
                            ? `المورد موجود - ${existingCoffees.length} قهوة مسجلة` 
                            : `Supplier exists - ${existingCoffees.length} coffees registered`}
                        </span>
                      </div>
                      {existingCoffees.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowExistingCoffees(!showExistingCoffees)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                        >
                          {showExistingCoffees ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span className="mx-1">
                            {language === 'ar' ? 'عرض القائمة' : 'Show list'}
                          </span>
                        </Button>
                      )}
                    </div>
                    
                    {/* Existing Coffees List */}
                    {showExistingCoffees && existingCoffees.length > 0 && (
                      <div className="mt-3 max-h-48 overflow-y-auto">
                        <div className="grid gap-1">
                          {existingCoffees.map((coffee, index) => (
                            <div 
                              key={index} 
                              className="flex items-center gap-2 text-sm py-1 px-2 bg-background/50 rounded"
                            >
                              <Coffee className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{coffee.name}</span>
                              {coffee.origin && (
                                <span className="text-muted-foreground text-xs">({coffee.origin})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
                      {language === 'ar' 
                        ? 'سيتم إضافة القهوة الجديدة فقط وتخطي الموجودة' 
                        : 'Only new coffees will be added, existing ones will be skipped'}
                    </p>
                  </div>
                )}
              </div>

              {/* Input Mode Tabs */}
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "paste")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('upload.fileTab')}
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4" />
                    {t('upload.pasteTab')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-4">
                  {/* Drop Zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
                      dragActive
                        ? "border-coffee-gold bg-coffee-gold/5"
                        : file
                        ? "border-coffee-green bg-coffee-green/5"
                        : "border-border hover:border-coffee-gold/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isProcessing}
                    />

                    {file ? (
                      <div className="space-y-3">
                        <CheckCircle className="w-12 h-12 text-coffee-green mx-auto" />
                        <p className="text-foreground font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} ميجابايت
                        </p>
                        {isLargeFile && (
                          <>
                            <div className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                              <p className="text-sm">
                                {language === 'ar' 
                                  ? 'ملف كبير - قد يستغرق التحليل وقتاً أطول'
                                  : 'Large file - analysis may take longer'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Checkbox
                                id="limitPages"
                                checked={limitPages}
                                onCheckedChange={(checked) => setLimitPages(checked === true)}
                              />
                              <label 
                                htmlFor="limitPages" 
                                className="text-sm text-foreground cursor-pointer"
                              >
                                {language === 'ar' 
                                  ? 'تحليل أول 50 صفحة فقط (أسرع)'
                                  : 'Analyze first 50 pages only (faster)'}
                              </label>
                            </div>
                          </>
                        )}
                        {!isProcessing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                              setExtractedData(null);
                              setIsLargeFile(false);
                            }}
                          >
                            إزالة الملف
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-foreground font-medium">
                          اسحب ملف هنا أو انقر للاختيار
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF أو ملف نصي - سيتم تحليله بالذكاء الاصطناعي
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  {/* Text Paste Area */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      الصق محتوى قائمة المورد هنا
                    </label>
                    <Textarea
                      placeholder="الصق هنا محتوى قائمة المورد (الأسماء، الأسعار، المنشأ، المعالجة، النكهات...)"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="min-h-[200px] text-right"
                      dir="rtl"
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      يمكنك نسخ المحتوى من ملف PDF أو Excel أو أي مصدر آخر ولصقه هنا
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-coffee-gold/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-coffee-gold" />
                      {getStageLabel(processingStage)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {language === 'ar' 
                      ? 'الملفات الكبيرة قد تستغرق وقتاً أطول للتحليل'
                      : 'Large files may take longer to analyze'}
                  </p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                variant="coffee"
                size="lg"
                className="w-full"
                onClick={handleUpload}
                disabled={(inputMode === "file" ? !file : !pastedText.trim()) || !supplierName || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    {getStageLabel(processingStage)}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 ml-2" />
                    تحليل بالذكاء الاصطناعي
                  </>
                )}
              </Button>

              {/* Extracted Data Preview */}
              {extractedData && extractedData.length > 0 && (
                <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-coffee-green" />
                    تم استخراج {extractedData.length} محصول
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {extractedData.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-card rounded-lg border border-border text-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {item.origin} {item.region && `- ${item.region}`} • {item.process}
                            </p>
                          </div>
                          {item.price && (
                            <span className="text-coffee-gold font-bold">
                              {item.price} {item.currency || "SAR"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={resetForm}
                  >
                    رفع ملف آخر
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UploadSection;
