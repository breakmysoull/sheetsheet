import { motion } from 'framer-motion';
import { Package, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onImportClick: () => void;
}

export const Header = ({ onImportClick }: HeaderProps) => {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-hero border-b border-border"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-gradient-primary shadow-glow"
            >
              <Package className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Inventário
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão inteligente de estoque
              </p>
            </div>
          </div>
          
          <Button
            onClick={onImportClick}
            variant="default"
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
};