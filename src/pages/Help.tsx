import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  MessageSquare, 
  Download, 
  Search,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Help = () => {
  const navigate = useNavigate()
  const features = [
    {
      icon: FileSpreadsheet,
      title: "Importação de Planilhas",
      description: "Importe arquivos .xlsx com múltiplas abas. Cada aba representa uma categoria do inventário.",
      example: "Clique em 'Importar' e selecione seu arquivo Excel"
    },
    {
      icon: MessageSquare,
      title: "Comandos de Texto",
      description: "Atualize o estoque digitando comandos simples, como em uma conversa.",
      example: "Digite: Tomate 5, Batata 3, Cebola 2"
    },
    {
      icon: Download,
      title: "Exportação",
      description: "Baixe a planilha atualizada a qualquer momento.",
      example: "Digite: /exportar ou clique no botão de download"
    },
    {
      icon: Search,
      title: "Busca Inteligente",
      description: "Encontre produtos rapidamente usando a barra de busca.",
      example: "Digite parte do nome do produto para filtrar"
    },
    {
      icon: TrendingUp,
      title: "Log de Atualizações",
      description: "Acompanhe todas as mudanças no estoque em tempo real.",
      example: "Veja quem atualizou, quando e quanto"
    }
  ];

  const commands = [
    { command: "Produto Quantidade", description: "Adiciona quantidade ao produto", example: "Tomate 5" },
    { command: "Múltiplos itens", description: "Separe com vírgula ou ponto e vírgula", example: "Tomate 5, Batata 3" },
    { command: "/exportar", description: "Baixa a planilha atualizada", example: "/exportar" },
    { command: "/help", description: "Mostra comandos disponíveis", example: "/help" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home'); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-accent">
                <HelpCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Central de Ajuda
                </h1>
                <p className="text-sm text-muted-foreground">
                  Aprenda a usar o sistema de inventário
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground">Funcionalidades</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-primary">
                        <feature.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      {feature.description}
                    </CardDescription>
                    <div className="bg-muted p-2 rounded text-sm">
                      <span className="text-muted-foreground">Exemplo: </span>
                      <span className="text-foreground">{feature.example}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground">Comandos de Texto</h2>
          <Card>
            <CardHeader>
              <CardTitle>Lista de Comandos</CardTitle>
              <CardDescription>
                Use estes comandos no campo de texto para atualizar o inventário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commands.map((cmd, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <code className="bg-gradient-secondary text-secondary-foreground px-3 py-1 rounded font-mono text-sm">
                      {cmd.command}
                    </code>
                    <span className="text-muted-foreground text-sm flex-1">
                      {cmd.description}
                    </span>
                    <span className="text-foreground text-sm bg-muted px-2 py-1 rounded">
                      {cmd.example}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-hero">
            <CardHeader>
              <CardTitle>Dicas Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span className="text-foreground">
                    Os valores são sempre <strong>somados</strong> ao estoque atual
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span className="text-foreground">
                    A busca funciona com correspondência parcial
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span className="text-foreground">
                    Dados são salvos automaticamente no navegador
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning">⚠️</span>
                  <span className="text-foreground">
                    Para subtrair, use números negativos: "Tomate -2"
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.section>

        <div className="text-center py-8">
          <Link to="/inventory">
            <Button className="bg-gradient-primary hover:opacity-90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Inventário
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Help;
