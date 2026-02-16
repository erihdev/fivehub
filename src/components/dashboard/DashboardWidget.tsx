import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface DashboardWidgetProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onRemove?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  dragHandleProps?: any;
}

export const DashboardWidget = ({
  id,
  title,
  icon,
  children,
  onRemove,
  isExpanded,
  onToggleExpand,
  dragHandleProps,
}: DashboardWidgetProps) => {
  const { dir } = useLanguage();

  return (
    <Card 
      className={`h-full transition-all duration-300 ${isExpanded ? 'col-span-2 row-span-2' : ''}`}
      dir={dir}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onToggleExpand(id)}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(id)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};

export default DashboardWidget;
