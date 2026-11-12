# Controle de Despesas (PWA)

App de controle de despesas pessoais que se instala na tela inicial do celular.
Publicado em https://efsosud-rgb.github.io/despesas/

- Despesas únicas, futuras e recorrentes (semanal, mensal, anual ou parcelada), com fim por quantidade de vezes ou por data.
- Recebíveis (renda) de uma ou mais pessoas da família, cada um no nome de quem recebe.
- Marca o que foi pago ou recebido, mostra o que está atrasado e o saldo previsto do mês.
- Sem login nesta versão: os dados ficam só no aparelho (localStorage). Backup e restauração por arquivo JSON em Família › Ajustes.
- Funciona sem internet depois da primeira visita (service worker).
- Logo 3D interativa (Three.js) na tela de boas-vindas e em Ajustes.

## Estrutura

| Pasta/arquivo | O que tem |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js` | Página, dados de instalação e o service worker |
| `js/datas.js`, `js/dinheiro.js` | Datas `AAAA-MM-DD` sem fuso e dinheiro em centavos inteiros |
| `js/recorrencia.js` | Regras de repetição e as ocorrências que cada lançamento gera |
| `js/resumo.js` | Totais do mês, pendências e renda por pessoa |
| `js/dados.js`, `js/loja.js` | Leitura, conferência e gravação dos dados; backup |
| `js/acoes.js` | Todas as mudanças nos dados (funções puras) e a validação do formulário |
| `js/app.js`, `js/telas.js`, `js/folhas.js`, `js/ui.js`, `js/boas-vindas.js`, `js/instalacao-ui.js` | Interface (Preact + htm, sem etapa de build) |
| `js/logo3d.js` | Cena 3D da logo |
| `vendor/` | Bibliotecas de terceiros com versão fixa (licenças em `vendor/LICENCAS.txt`) |
| `fontes/`, `icones/`, `css/` | Fontes Inter e Space Grotesk (OFL), ícones do app, estilos |
| `testes/` | Testes automáticos (`node --test`) |

## Como mudar o app

Não há etapa de build: o que está nesta pasta é o que o GitHub Pages publica.

1. Edite os arquivos.
2. Rode `node ferramentas/atualizar-sw.mjs` (atualiza a lista e a versão do service worker; sem isso, quem já instalou continua com a versão antiga guardada).
3. Rode `npm test` (ou `node --test "testes/*.test.js"`). Precisa do Node 22 ou mais novo.
4. Faça o commit e o push para a branch `main`.

## Formato dos dados

Guardados na chave `controle-despesas:v1` do localStorage. Cada lançamento guarda a regra (valor, primeira data e repetição);
as ocorrências são calculadas na hora. O que muda numa ocorrência só fica no lançamento pelo número da ocorrência:
`baixas` (pagas/recebidas), `ajustes` (valor diferente só naquela vez), `excluidas` e `corte` ("esta e as próximas" apagadas).
