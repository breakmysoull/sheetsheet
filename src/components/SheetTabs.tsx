import React from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SheetTabsProps {
  sheets: Sheet[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export const SheetTabs = ({ sheets, activeIndex, onTabChange }: SheetTabsProps) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const isEmpty = sheets.length === 0;

  const scrollToTab = React.useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const tabWidth = 140; // Approximate tab width
    const scrollPosition = index * tabWidth - container.clientWidth / 2 + tabWidth / 2;
    
    container.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, []);

  // Swipe handlers for sheet navigation
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const nextIndex = Math.min(activeIndex + 1, sheets.length - 1);
      if (nextIndex !== activeIndex) {
        onTabChange(nextIndex);
        scrollToTab(nextIndex);
      }
    },
    onSwipedRight: () => {
      const prevIndex = Math.max(activeIndex - 1, 0);
      if (prevIndex !== activeIndex) {
        onTabChange(prevIndex);
        scrollToTab(prevIndex);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false, // Allow vertical scroll
  });

  const scrollLeft = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  const handleTabClick = React.useCallback((index: number) => {
    onTabChange(index);
    scrollToTab(index);
  }, [onTabChange, scrollToTab]);

  if (isEmpty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full"
      {...handlers}
    >
      {/* Scroll buttons only for mobile screens */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="h-full rounded-none bg-gradient-to-r from-background to-transparent px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="h-full rounded-none bg-gradient-to-l from-background to-transparent px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide gap-2 p-2 bg-muted/30 rounded-lg md:overflow-x-visible md:justify-start"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {sheets.map((sheet, index) => (
          <motion.button
            key={index}
            onClick={() => handleTabClick(index)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200",
              "min-w-[120px] max-w-[160px] text-left",
              index === activeIndex
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "bg-background hover:bg-muted text-foreground hover:scale-102"
            )}
            whileHover={{ scale: index === activeIndex ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {sheet.name}
              </div>
              <div className="text-xs opacity-70">
                {sheet.items.length} itens
              </div>
            </div>
            
            <Badge 
              variant={index === activeIndex ? "secondary" : "outline"}
              className="h-5 px-1.5 text-xs shrink-0"
            >
              {sheet.items.length}
            </Badge>
          </motion.button>
        ))}
      </div>

      {/* Mobile swipe indicator */}
      <div className="flex justify-center mt-2 md:hidden">
        <div className="flex gap-1">
          {sheets.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === activeIndex ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Instructions for mobile */}
      {sheets.length > 1 && (
        <div className="text-center mt-2 md:hidden">
          <p className="text-xs text-muted-foreground">
            👆 Arraste para navegar • {activeIndex + 1} de {sheets.length}
          </p>
        </div>
      )}
    </motion.div>
  );
};
