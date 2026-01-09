# Murdoku

Jogo de lógica inspirado no livro **Murdoku**: você recebe a planta de ambientes, objetos e pistas para posicionar suspeitos, deduzir a vítima (último quadrado disponível) e identificar o assassino.

## Como jogar

1. **Gere uma fase** com seed e dificuldade.
2. Clique em um suspeito e depois em uma célula para posicioná-lo.
3. Respeite as regras:
   - Um suspeito por linha e por coluna.
   - Suspeitos só podem ficar em células vazias ou com objetos ocupáveis (poltrona, tapete, cama).
   - Células com objetos bloqueantes (mesa, TV, planta, estante, caixa) não podem ter pessoas.
4. Após posicionar todos os suspeitos, deve sobrar **exatamente uma célula livre válida**: ela é a posição da vítima.
5. O assassino é o suspeito que está **no mesmo ambiente** da vítima.

### Interpretação das pistas

- **No ambiente X**: o suspeito está em qualquer célula daquele ambiente.
- **Em uma cama/tapete/poltrona**: o suspeito está exatamente sobre aquele objeto.
- **Ao lado de X**: adjacente (N/S/E/W) a um objeto.
- **Junto de X**: adjacente **ou** no mesmo ambiente do objeto.
- **Na frente de uma janela**: célula encostada ao segmento de parede com janela (borda ou parede interna).

## Executando o projeto

```bash
npm install
npm run dev
```

## Como adicionar novos objetos

1. Adicione o tipo em `src/engine/types.ts` (arrays `OCCUPIABLE_OBJECTS` ou `BLOCKING_OBJECTS`).
2. Atualize o ícone do Canvas em `src/ui/CanvasBoard.tsx` na constante `objectIcons`.
3. Se necessário, ajuste o texto da pista em `src/engine/generator.ts` na função `clueText`.

## Testes

```bash
npm test
```
