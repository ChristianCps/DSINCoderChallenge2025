# DSINCoderChallenge2025

# Resumo de Tecnologias do Projeto DSIN - Coder Challenge 2025

Esta seção detalha as principais tecnologias e ferramentas utilizadas no desenvolvimento do "DSIN - Coder Challenge 2025", categorizadas para uma visão rápida.

| Categoria | Tecnologias |
|----------|-------------|
| **Linguagem de Programação** | TypeScript |
| **Framework Frontend** | React |
| **Estilização** | Tailwind CSS |
| **Banco de Dados (BaaS)** | Supabase (com PostgreSQL subjacente) |
| **Runtime / Build Tool** | Node.js (Runtime) e Vite (Bundler / Dev Server) |
| **Gerenciamento de Pacotes** | npm (ou Yarn/pnpm) |
| **Roteamento Frontend** | react-router-dom |
| **Gerenciamento de Estado** | React Hooks (useState, useEffect, useCallback, useContext) |
| **Notificações UI** | react-hot-toast |
| **Tooltips UI** | react-tooltip |
| **Ícones UI** | Lucide React, Heroicons |
| **Mapas Interativos** | react-simple-maps, react-leaflet, leaflet |
| **Geocodificação** | Nominatim (OpenStreetMap API Externa) |
| **Interação com Backend** | @supabase/supabase-js |
| **UI Patterns** | Componentização, Modais Customizados, Formulários Controlados, Grids Responsivos |
| **Padrões de Projeto** | Componentes Funcionais, Hooks Customizados, Lógica de Negócio Separada (e.g., classification.ts) |



# Funcionalidades do Sistema: DSIN - Coder Challenge 2025

O "DSIN - Coder Challenge 2025" é uma aplicação abrangente projetada para gerenciar e simular operações de captura de entidades anômalas. Abaixo estão as principais funcionalidades organizadas por módulos:

## 1. Módulo de Catalogação e Gerenciamento
Este módulo centraliza todas as operações CRUD (Criar, Ler, Atualizar, Excluir) para os dados principais da operação.

### 1.1. Catálogo de Patos Primordiais
- **Listagem Completa:** Visualização de todos os Patos Primordiais registrados no sistema.
- **Filtragem Avançada:** Capacidade de filtrar patos por:
  - status de hibernação (Desperto, Em Transe, Hibernação Profunda, Capturado)
  - país de ocorrência
  - nível de risco (Nenhum, Baixo, Médio, Alto, Crítico)
- **Detalhes do Pato:** Exibição de informações detalhadas sobre um pato específico, incluindo dados biológicos, localização, mutações, superpoder (se despertado), status e cálculo dinâmico do Nível de Risco.
- **Criação de Novo Registro:** Formulário com seleção de localização via mapa interativo (react-leaflet).
- **Edição de Registros:** Atualização de informações existentes.
- **Exclusão de Registros:** Remoção com modal de confirmação.

### 1.2. Gerenciamento de Drones

#### Fabricantes de Drones
- CRUD completo
- Restrição: não permite excluir fabricantes com marcas associadas vinculadas a patos
- Modal de confirmação

#### Marcas de Drones
- CRUD completo
- Restrição: não permite excluir marcas associadas a patos
- Modal de confirmação

### 1.3. Bases de Operações
- **Listagem** de Sede e Filiais
- **Criação** com localização via mapa interativo
- **Edição** de registros
- **Exclusão** com confirmação

## 2. Módulo de Análise Tática
Este módulo fornece insights estratégicos para tomada de decisão antes de uma missão.

### 2.1. Dashboard
- Visão geral do sistema (ex: total de patos, capturados etc.)
- Mapa de ocorrências global (react-simple-maps)

### 2.2. Visão de Captura
- Seleção de alvo e base operacional
- Avaliação dinâmica exibindo:
  - Custo da Missão
  - Nível de Risco
  - Valor Científico
  - Dificuldade de Captura

## 3. Módulo de Simulação e Histórico de Missões
Simula a execução de missões de captura e armazena resultados.

### 3.1. Fase de Voo do Drone
- Simulação em tempo real
- Exibição de recursos do drone (integridade, bateria, combustível)
- Eventos aleatórios
- Logs detalhados

### 3.2. Fase de Encontro / Combate
- Combate por turnos
- **Ações do Drone:**
  - Scan Tático
  - Ataque Básico
  - Ataque Especial
  - Ataque Rasante
  - Suporte: Escudo, Absorver, Queimar Combustível, Nano-Reparo, SGDA
  - Captura
- **IA do Pato:** reações autônomas
- Sistema de Despertar
- Logs completos

### 3.3. Histórico de Missões
- Registro completo das missões
- Visualização de logs detalhados

## 4. Funcionalidades de Usabilidade e Layout
- Interface Responsiva
- Navegação Intuitiva lateral



# Como Rodar o Projeto Localmente

Este guia detalha os passos necessários para configurar e executar a aplicação **"DSIN - Coder Challenge 2025"** no seu ambiente de desenvolvimento local.  

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter o seguinte software instalado em sua máquina:

- **Node.js**: Versão 18.x ou superior  
  Baixe em: https://nodejs.org/
- **npm**: Gerenciador de pacotes do Node.js  
  (Geralmente vem junto com o Node.js)

Você pode verificar as versões instaladas executando:

```
node --version
npm --version
```

---

## 🛠️ Configuração do Projeto

Siga estes passos para preparar o ambiente:

1. **Clone o Repositório do GitHub**
   Abra o terminal e execute:
   ```
   git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   ```
   Depois, navegue até a pasta do projeto:
   ```
   cd SEU_REPOSITORIO
   ```

2. **Tenha o Node.js e npm instalados**
   Para verificar as versões:
   ```
   node --version
   npm --version
   ```
   Recomendado: Node.js 18.x ou superior.

3. **Instale as Dependências**
   ```
   npm install
   ```
   Esse processo pode levar alguns minutos.

4. **Crie o Arquivo `.env`**
   Você precisa criar sua própria instância no Supabase para que o projeto funcione corretamente.

### Criar o Supabase

Acesse: https://supabase.com

Após criar uma conta:

📌 Dentro do seu projeto no Supabase:

**Criando as Tabelas no Supabase**  
As tabelas necessárias para o funcionamento da aplicação não vêm prontas. Siga os passos abaixo:

1. Vá para **SQL Editor** no projeto que você criou.
2. Abra o arquivo [supabase_schema_setup.txt](./supabase_schema_setup.txt) localizado acima (que está na raiz do projeto).
3. Copie todo o conteúdo do arquivo.
4. Cole o conteúdo no **SQL Editor** do Supabase.
5. Clique em **Run ▶** para executar.

Pronto! Todas as tabelas, índices e relacionamentos serão criados automaticamente e sua aplicação poderá se conectar ao banco de dados.

**Para obter `VITE_SUPABASE_URL`:**
- Vá em **Project Settings**
- Vá em **Data API**
- Copie a URL do projeto

**Para obter `VITE_SUPABASE_ANON_KEY`:**
- Vá em **Project Settings**
- Vá em **API Keys**
- Copie a chave pública (anon)

Crie um arquivo `.env` na raiz do projeto e adicione:

```
VITE_SUPABASE_URL="https://[SEU_ID_DO_PROJETO].supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLIC_AQUI"
```

⚠️ Observação importante:
Se o `.env` não existir ou estiver com chaves incorretas, o app não conseguirá se conectar ao banco de dados.

---

## 🚀 Executando a Aplicação

Com tudo configurado:

1. **Inicie o servidor**
```
npm run dev
```

2. **Acesse no navegador**
Geralmente:
```
http://localhost:5173
```

🎉 **Pronto!**
O **Projeto DSIN - Coder Challenge 2025** estará rodando localmente na sua máquina.

