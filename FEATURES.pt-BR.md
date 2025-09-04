# Aprimoramentos Paranormais do JP – Detalhes das Funcionalidades

Este documento fornece **detalhes técnicos** de cada funcionalidade para contribuidores e usuários avançados.

---

## 🔫 Controle de Munição

**Funções:**
- `reloadWeapon(weapon)` – Recarrega uma arma de longo alcance do inventário.
- `wrapRollAttack(wrapped, ...args)` – Envolve a rolagem de ataque, consumindo munição.

**Resumo de Flags:**

| Flag | Propriedade | Tipo | Descrição |
|------|------------|------|-----------|
| `ammo` | `current` | número | Munição atualmente carregada na arma |
| `ammo` | `max` | número | Capacidade máxima de munição da arma |
| `itemType` | `ammunition` | string | Identifica itens como munição para recarga |

**Limitações:**
- O item de munição deve ter **o mesmo nome** do tipo de munição esperado pela arma.

**Futuras Melhorias:**
- Combinação de munição mais flexível (ignorar nome exato, combinar por tipo ou categoria).

---

## 💥 Dano Crítico Personalizado

**Funções:**
- `wrapRollDamage(wrapped, options)` – Envolve a rolagem de dano original para implementar dano crítico personalizado.

**Comportamento:**
- Maximiza os dados de dano base em acertos críticos.  
- Adiciona dados críticos adicionais conforme o multiplicador.  
- Inclui outros componentes da fórmula, como atributos ou bônus.  
- Envia a rolagem ao chat com um texto personalizado.

**Notas:**
- Aplicado somente quando `options.critical.isCritical` é `true`.  
- Multiplicador padrão é x2 se não especificado.

---

## 🔦 Lanternas / Iluminação

**Funções:**
- `toggleIllumination(actorId, itemId)` – Alterna o estado da luz e atualiza o token.

**Resumo de Flags:**

| Flag | Propriedade | Tipo | Descrição |
|------|------------|------|-----------|
| `light` | `isOn` | boolean | Se a luz está ligada |
| `light` | `dim` | número | Raio da luz difusa (dim) |
| `light` | `bright` | número | Raio da luz intensa (bright) |
| `light` | `color` | string | Cor da luz (hexadecimal) |
| `light` | `angle` | número | Ângulo da luz (graus) |
| `light` | `animation` | object | Configuração de animação (`type`, `speed`, `intensity`) |

**Notas:**
- Valores padrão são aplicados se dim/bright não forem configurados.  
- Prioriza o token controlado, depois qualquer token do ator na cena.

---

## 🔋 Gerenciamento de Bateria

**Funções:**
- `checkBattery(item)` – Rolagem de dados progressiva para verificar o estado da bateria.  
- `rechargeBattery(item)` – Recarrega a bateria do item para full power (d20).

**Resumo de Flags:**

| Flag | Propriedade | Tipo | Descrição |
|------|------------|------|-----------|
| `battery` | `dieIndex` | número | Índice atual na sequência de dados `[20,12,10,8,6,4]` |
| `battery` | `usesOnDie` | número | Número de usos no dado atual |
| `battery` | `hasPower` | boolean | Se a bateria está ativa |
| `battery` | `isPotent` | boolean | Opcional; exige 2 usos para avançar de dado |

**Notas:**
- Notificações informam sucesso ou falha ao testar a bateria.  
- Dados progressivos simulam desgaste da bateria.

**Futuras Melhorias:**
- Depleção automática de bateria com o tempo ou uso.  
- Efeitos avançados quando a bateria falha (ex.: mau funcionamento do item).

---

## Diretrizes para Contribuição

- Siga a **estrutura de módulo do Foundry VTT** para novas funcionalidades.  
- Use `game.i18n.localize()` para todo texto exibido ao usuário.  
- Adicione ou atualize **flags** sob `paranormal-enhancements`.  
- Documente novas funcionalidades neste arquivo `FEATURES.pt-BR.md`.

---

## Changelog

- **v1.0.0** – Lançamento inicial com Controle de Munição, Dano Crítico Personalizado, Lanternas e Gerenciamento de Bateria.
