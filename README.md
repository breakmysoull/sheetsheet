# 🍽️ **Sheet Chef Sync - Sistema de Inventário Inteligente**

Sistema moderno de gerenciamento de inventário com integração Google Sheets e Firebase.

## 🚀 **Características**

- ✅ **Interface Moderna**: React + TypeScript + Tailwind CSS
- 🔄 **Sync Google Sheets**: Integração bidirecional com planilhas
- 🔥 **Firebase Backend**: Firestore + Hosting
- 📱 **Responsivo**: Mobile-first design
- 🎯 **Smart Commands**: Sistema de comandos inteligente
- 🔍 **Auto-sugestões**: Detecção de itens inexistentes
- 📊 **Analytics**: Logs detalhados de alterações

## 🛠️ **Setup Local**

### **1. Clonar e Instalar**
```bash
git clone https://github.com/breakmysoull/inventario.git
cd inventario
npm install
```

### **2. Configurar Variáveis de Ambiente**
```bash
cp .env.example .env
```

Preencha o `.env` com suas credenciais Firebase:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### **3. Executar Localmente**
```bash
npm run dev
```

## 🔥 **Deploy Firebase**

### **1. Setup Firebase**
```bash
# Login
npx firebase login

# Inicializar projeto
npx firebase init

# Selecione:
# - Hosting
# - Firestore
# - Conecte ao seu projeto Firebase
```

### **2. Deploy**
```bash
# Build e deploy
npm run deploy

# Ou apenas deploy
npm run firebase:deploy
```

## 📋 **Scripts Disponíveis**

```bash
npm run dev          # Servidor desenvolvimento
npm run build        # Build produção
npm run deploy       # Build + Deploy Firebase
npm run firebase:deploy  # Deploy direto
npm run firebase:serve   # Preview local
```

## 🏗️ **Estrutura do Projeto**

```
src/
├── components/        # Componentes React
├── hooks/            # Custom hooks
├── services/         # APIs e serviços
├── types/            # Definições TypeScript
├── config/           # Configurações Firebase
└── utils/            # Utilitários
```

## 🔧 **Configuração Firebase**

### **1. Criar Projeto**
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie novo projeto
3. Ative Firestore e Hosting

### **2. Configurar Firestore**
- Regras de segurança em `firestore.rules`
- Índices em `firestore.indexes.json`

### **3. Google Sheets API (Opcional)**
1. [Google Cloud Console](https://console.cloud.google.com)
2. Ativar Google Sheets API
3. Criar credenciais OAuth 2.0

## 🎯 **Como Usar**

### **Comandos Básicos**
```
Tomate 5, Batata 3    # Adicionar itens
/exportar             # Baixar planilha
/help                 # Ajuda
```

### **Funcionalidades**
- **Adicionar**: Soma às quantidades existentes
- **Atualizar**: Substitui quantidades
- **Sugestões**: Auto-correção para itens não encontrados
- **Export/Import**: Excel (.xlsx)

## 🌐 **Links**

- **Demo**: [Em breve]
- **GitHub**: https://github.com/breakmysoull/inventario
- **Firebase**: [Seu projeto Firebase]

## 📞 **Suporte**

Para dúvidas ou problemas, abra uma [issue](https://github.com/breakmysoull/inventario/issues).

---

**Desenvolvido com ❤️ usando React + Firebase**
