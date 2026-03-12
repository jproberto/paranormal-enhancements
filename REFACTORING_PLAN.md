# Plano de Refatoração e Nova Arquitetura

Este documento serve como guia para a refatoração do módulo `paranormal-enhancements`, visando a adoção de uma arquitetura em camadas (Clean Architecture) para melhorar a manutenção, testabilidade e escalabilidade.

## 1. Visão Geral da Arquitetura

A nova estrutura divide o código em três camadas principais:

*   **Core (Domínio):** Contém a lógica de negócio pura. Não deve depender de UI ou APIs específicas de renderização do Foundry sempre que possível.
*   **Application (Aplicação):** Orquestra o fluxo de dados entre a UI e o Core. Gerencia Diálogos, Chat Cards e Injeção de HTML.
*   **Infrastructure (Infraestrutura):** Lida com detalhes técnicos, como chamadas de API do Foundry (Hooks, Socket, FileSystem), Logs e Utilitários.

### Estrutura de Pastas Alvo

```
src/
├── core/
│   ├── services/           # Regras de negócio (ex: cálculo de dano, recarga, consumo de bateria)
│   └── models/             # Modelos de dados (ex: BaseRitual)
│
├── application/
│   ├── services/           # Serviços de UI (ex: manipuladores de ficha, chat listeners)
│   └── ui/                 # Classes de Application/Dialog do Foundry
│
└── infrastructure/
    ├── utils/              # Utilitários (Logger, Helpers)
    └── services/           # Serviços de infra (Socket, Settings)
```

---

## 2. Status Atual

*   **Logger:** ✅ Implementado (`src/infrastructure/utils/Logger.js`).
*   **Armamento:** 🚧 Parcialmente migrado. `ArmamentService` e `ArmamentDialogs` existem, mas o `armament-handler.js` ainda atua como um controlador legado.
*   **Demais Funcionalidades:** Ainda no modelo antigo (arquivos `*-handler.js` na raiz de `features/`).

---

## 3. Roteiro de Refatoração (Atualizado)

O foco é migrar todos os domínios periféricos primeiro, deixando o núcleo complexo de Rituais para o final.

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

O objetivo é extrair a lógica de negócio dos handlers atuais para serviços testáveis em `src/core/services`.

1.  **Bateria (`battery-handler.js`)**
    *   **Ação:** Criar `src/core/services/BatteryService.js`.
    *   **Lógica a migrar:** `checkBattery` (lógica de rolagem de dados decrescentes) e `rechargeBattery`.
    *   **Refatoração:** O handler antigo deve apenas chamar este serviço.

2.  **Iluminação (`illumination-handler.js`)**
    *   **Ação:** Criar `src/core/services/IlluminationService.js`.
    *   **Lógica a migrar:** `toggleIllumination` (lógica de alternar estado e atualizar luzes do token).

3.  **Maldições (`curse-handler.js`)**
    *   **Ação:** Criar `src/core/services/CurseService.js`.
    *   **Lógica a migrar:** `applyCurseEffects` (verificação de itens amaldiçoados baseada em atributos).
    *   **Nota:** A lógica de criação de mensagem de chat pode ficar no serviço por enquanto ou ser movida para uma camada de aplicação posteriormente.

4.  **Itens Especiais (`special-items-handler.js`)**
    *   **Ação:** Criar `src/core/services/SpecialItemService.js`.
    *   **Lógica a migrar:** Lógica do "Arcabuz" e registro de handlers de dano especial.

### Fase 2: Camada de Aplicação (UI & Listeners)

O objetivo é organizar a manipulação de interface (Fichas e Chat) em serviços de aplicação dedicados em `src/application`.

5.  **Manipulação de Ficha de Item (`item-sheet-handler.js`)**
    *   **Ação:** Criar `src/application/services/ItemSheetService.js`.
    *   **Responsabilidade:** Centralizar a injeção de HTML (campos de munição, bateria, maldição) nas fichas.
    *   **Refatoração:** O arquivo original deve ser substituído por este serviço, que será invocado pelo Hook `renderItemSheet`.

6.  **Manipulação de Chat (`chat-handler.js` e subpastas)**
    *   **Ação:** Criar `src/application/services/ChatService.js`.
    *   **Responsabilidade:** Gerenciar a renderização de botões no chat (ataque, recarga, rituais) e os listeners de eventos.
    *   **Integração:** Unificar a lógica dispersa em `features/chat/` (equipment.js, armament.js) dentro deste serviço ou estratégias importadas por ele.

### Fase 3: Limpeza e Consolidação

7.  **Remoção de Handlers Legados**
    *   Após a migração, os arquivos em `features/` (exceto rituais) devem ser removidos ou transformados em simples pontos de entrada que delegam para `src/`.
    *   Atualizar `main.js` (ou o ponto de entrada atual) para registrar os Hooks usando a nova estrutura.

### Fase 4: O Domínio de Rituais (Final)

Apenas após a estabilização dos itens acima, iniciaremos a refatoração profunda dos rituais.

8.  **Core dos Rituais**
    *   Criar `src/core/models/BaseRitual.js` (Classe Abstrata).
    *   Criar `src/core/services/RitualService.js` (Gerenciamento de execução).

9.  **UI dos Rituais**
    *   Migrar `ritual-ui.js` para `src/application/ui/RitualDialogs.js`.

10. **Implementações**
    *   Refatorar `arma-atroz.js` e outros para estender `BaseRitual`.
