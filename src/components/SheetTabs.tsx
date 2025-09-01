import { motion } from 'framer-motion';
import { Sheet } from '@/types/inventory';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface SheetTabsProps {
  sheets: Sheet[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export const SheetTabs = ({ sheets, activeIndex, onTabChange }: SheetTabsProps) => {
  if (sheets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full overflow-x-auto"
    >
      <Tabs value={activeIndex.toString()} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          {sheets.map((sheet, index) => (
            <TabsTrigger
              key={index}
              value={index.toString()}
              onClick={() => onTabChange(index)}
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
            >
              <span className="mr-2">{sheet.name}</span>
              <Badge 
                variant={index === activeIndex ? "secondary" : "outline"}
                className="ml-1 h-5 px-1.5 text-xs"
              >
                {sheet.items.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </motion.div>
  );
};