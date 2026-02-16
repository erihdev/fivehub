import { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * للتعامل الاحترافي مع الأخطاء وعدم تعطيل التطبيق بالكامل
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        // يمكنك إرسال الخطأ إلى service مثل Sentry هنا
        // Sentry.captureException(error, { extra: errorInfo });

        this.setState({
            error,
            errorInfo,
        });
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="max-w-2xl w-full p-8 glass-effect animate-scale-in">
                        <div className="text-center space-y-6">
                            {/* Icon */}
                            <div className="flex justify-center">
                                <div className="p-4 rounded-full bg-red-500/10">
                                    <AlertTriangle className="h-16 w-16 text-red-500" />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-gradient-premium">
                                    عذراً، حدث خطأ ما!
                                </h1>
                                <p className="text-muted-foreground">
                                    نعتذر عن الإزعاج. حدث خطأ غير متوقع في التطبيق.
                                </p>
                            </div>

                            {/* Error Details (في وضع التطوير فقط) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Card className="p-4 bg-muted/30 text-right">
                                    <p className="text-sm font-mono text-red-500 mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="text-xs text-muted-foreground">
                                            <summary className="cursor-pointer hover:text-foreground">
                                                عرض التفاصيل التقنية
                                            </summary>
                                            <pre className="mt-2 text-right overflow-auto max-h-40">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </Card>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 justify-center">
                                <Button
                                    onClick={this.handleReset}
                                    className="hover-scale flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    إعادة المحاولة
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    variant="outline"
                                    className="hover-lift flex items-center gap-2"
                                >
                                    <Home className="h-4 w-4" />
                                    العودة للرئيسية
                                </Button>
                            </div>

                            {/* Help Text */}
                            <p className="text-sm text-muted-foreground">
                                إذا استمرت المشكلة، يرجى{' '}
                                <a
                                    href="/contact"
                                    className="text-primary hover:underline"
                                >
                                    التواصل مع الدعم الفني
                                </a>
                            </p>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
