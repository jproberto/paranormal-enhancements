# Plano de Refatoração e Nova Arquitetura para o Módulo Paranormal Enhancements

Este documento detalha a análise da arquitetura atual do projeto, propõe uma nova arquitetura baseada em princípios de Clean Architecture e estabelece um plano de ação para a refatoração.

## 1. Análise da Arquitetura Atual

Após uma análise completa de todos os arquivos na pasta `features`, os seguintes pontos foram observados:

### Pontos Fortes

*   **Funcionalidade Rica:** O módulo implementa diversas funcionalidades complexas que melhoram a experiência de jogo.
*   **Uso de APIs Modernas:** O código já utiliza APIs importantes do ecossistema Foundry, como `lib-wrapper` e `socketlib`, além de módulos como `Sequencer`.
*   **Intenção de Separação:** A existência da pasta `features` mostra uma intenção inicial de separar o código por domínios, o que é um ótimo ponto de partida.
*   **Padrões de Extensibilidade:** O uso de "registries" (como em `ritual-handler.js` e `special-items-handler.js`) é um padrão de design robusto que facilita a adição de novas funcionalidades.

### Principais Fraquezas

*   **Alto Acoplamento e Baixa Coesão:** Este é o problema central.
    *   **Mistura de Responsabilidades:** Arquivos como `armament-handler.js` e `item-sheet-handler.js` acumulam múltiplas responsabilidades, misturando lógica de negócio pura (cálculos de dano), com lógica de infraestrutura (hooks, wrappers) e lógica de UI (manipulação de DOM, diálogos).
    *   **Dependências Cruzadas:** Os arquivos se importam mutuamente de forma desorganizada, criando uma teia de dependências que dificulta a manutenção e o entendimento do fluxo de dados.
    *   **Hooks e Pontos de Contato Dispersos:** As interações com o sistema (chamadas `Hooks.on`) estão espalhadas por múltiplos arquivos, tornando difícil auditar todos os pontos em que o módulo modifica o comportamento do Foundry.
*   **Lógica de UI Acoplada:** A manipulação direta do DOM com jQuery dentro de funções de lógica de negócio (como em `item-sheet-handler.js`) torna o código frágil e difícil de testar.

## 2. Proposta de Nova Arquitetura (Clean Architecture)

Para resolver esses problemas, proponho uma reestruturação de pastas e arquivos baseada em **Layered Architecture** (Arquitetura em Camadas).

### Objetivos

1.  **Separar Camadas:** Isolar a **Lógica de Domínio** (as regras do seu módulo), da **Lógica de Aplicação** (orquestração e UI) e da **Infraestrutura** (interações com Foundry e outras APIs).
2.  **Inverter Dependências:** A camada de Domínio (o núcleo) não deve saber nada sobre o Foundry. As outras camadas dependem dela, e não o contrário.
3.  **Aumentar a Coesão:** Agrupar arquivos que mudam juntos e que pertencem ao mesmo contexto de negócio.

### Estrutura de Pastas Proposta

```
paranormal-enhancements/
├── src/
│   ├── main.js                 # NOVO: Ponto de entrada que apenas orquestra a inicialização.
│   ├── constants.js            # NOVO: Centraliza IDs, chaves de flags, etc.
│   │
│   ├── core/                   # NOVO: Lógica de negócio pura, agnóstica ao Foundry (O DOMÍNIO).
│   │   ├── services/           # NOVO: Serviços que encapsulam regras de negócio.
│   │   │   ├── ArmamentService.js    # Lógica de munição, recarga, rajada, dano crítico.
│   │   │   ├── BatteryService.js     # Lógica do consumo de bateria com dados decrescentes.
│   │   │   ├── CurseService.js       # Lógica que verifica as condições de maldição.
│   │   │   └── RitualService.js      # Gerencia o fluxo de execução de rituais.
│   │   │
│   │   ├── models/             # NOVO: Classes e modelos de dados.
│   │   │   └── BaseRitual.js         # NOVO: Classe base abstrata para todos os rituais.
│   │   │
│   │   └── rituals/            # NOVO: Implementações concretas de rituais.
│   │       ├── ArmaAtroz.js          # Agora estende BaseRitual.
│   │       ├── RitualRegistry.js     # O registro central de todas as classes de rituais.
│   │       └── ... (outros rituais que estendem a classe base)
│   │
│   ├── application/            # NOVO: Conecta o domínio à UI (A CAMADA DE APLICAÇÃO).
│   │   ├── services/           # NOVO: Serviços que orquestram a UI e o domínio.
│   │   │   ├── ChatService.js        # Adiciona botões e listeners ao chat.
│   │   │   ├── IlluminationService.js# Liga/desliga luzes e atualiza tokens.
│   │   │   └── ItemSheetService.js   # Injeta HTML e gerencia a lógica das fichas de item.
│   │   │
│   │   └── ui/                   # NOVO: Classes de UI (Applications do Foundry).
│   │       ├── ActiveRitualsApp.js   # A aplicação para gerenciar rituais ativos.
│   │       ├── DialogFactory.js      # NOVO: Central para criar todos os diálogos do módulo.
│   │       └── RitualPreRollDialog.js# O diálogo de pré-conjuração de rituais.
│   │
│   └── infrastructure/         # NOVO: Tudo que interage com sistemas externos (A CAMADA DE INFRAESTRUTURA).
│       ├── services/
│       │   ├── GMSocketService.js    # NOVO: Ações que rodam no GM via socket.
│       │   └── SocketProvider.js     # NOVO: Wrapper para registrar e executar chamadas socketlib.
│       │
│       ├── registries/
│       │   ├── HookRegistry.js       # NOVO: Ponto ÚNICO para registrar todos os Hooks.on().
│       │   └── LibWrapperRegistry.js # NOVO: Ponto ÚNICO para registrar todos os libWrapper.
│       │
│       └── utils/
│           └── Logger.js             # NOVO: Utilitário de log dedicado.
│
├── module.json
└── ... (assets, lang, packs, styles, templates)
```

## 3. Plano de Ação para Refatoração

A transição para a nova arquitetura pode ser feita de forma incremental.

1.  **Passo 1: Criar a Estrutura e Desmembrar o Ponto de Entrada**
    *   Criar a estrutura de pastas `src/core`, `src/application`, `src/infrastructure`.
    *   Mover as chamadas `Hooks.on` de `paranormal-enhancements.js` para `infrastructure/registries/HookRegistry.js`.
    *   Mover as chamadas `libWrapper.register` para `infrastructure/registries/LibWrapperRegistry.js`.
    *   Mover a configuração do `socketlib` para `infrastructure/services/SocketProvider.js`.
    *   Criar o novo `main.js` que irá orquestrar a inicialização desses registros.

2.  **Passo 2: Refatorar um Domínio Verticalmente**
    *   Escolher um domínio, como **Armamento**.
    *   Mover a lógica de cálculo pura de `armament-handler.js` para `core/services/ArmamentService.js`.
    *   Ajustar o `LibWrapperRegistry` para que a função de wrapper chame o novo serviço do `core`.
    *   Mover a criação de diálogos para `application/ui/DialogFactory.js`.
    *   Isso isolará toda a lógica de armamento na nova arquitetura, servindo de modelo para os outros domínios.

3.  **Passo 3: Refatorar Rituais com uma Classe Base**
    *   Criar a classe `core/models/BaseRitual.js` para encapsular a lógica comum de validação, preparação de dados e criação de efeitos.
    *   Refatorar `ArmaAtroz.js` para estender `BaseRitual`, simplificando drasticamente seu código.
    *   Mover a lógica de `ritual-handler.js` para `core/services/RitualService.js`.
    *   Mover a UI de `ritual-ui.js` para as classes e funções apropriadas em `application/ui/`.

4.  **Passo 4: Migrar os Demais Handlers**
    *   Aplicar o mesmo padrão do Passo 2 para os outros handlers (`battery-handler`, `curse-handler`, etc.), movendo suas lógicas para os respectivos serviços no `core` e ajustando os hooks na `infraestrutura`.

## 4. Benefícios da Nova Arquitetura

*   **Clareza e Manutenibilidade:** Fica óbvio onde encontrar cada tipo de lógica.
*   **Testabilidade:** A camada `core` pode ser testada de forma isolada, sem depender do Foundry.
*   **Reuso de Código:** Padrões como a `BaseRitual` evitam duplicação de código.
*   **Escalabilidade:** Adicionar novas funcionalidades se torna uma tarefa mais simples e segura, com menor risco de quebrar o que já existe.
