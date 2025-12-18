import { useLocation, useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Página não encontrada</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate('/home')}>Ir para o início</Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
