# Segurança e qualidade do Painel Colafix

Revisão de 16/11/2026. O que já está no código, o que **só a administradora** consegue fazer no console, e o que fica para depois.

## O que já está no código

| Assunto | O que mudou | Onde |
|---|---|---|
| Verificação automática | A cada commit, o GitHub confere a sintaxe do painel inteiro (as 91 partes são um bloco só: um erro em qualquer uma derrubava todas as telas), roda testes rápidos no Chrome e testa as regras do banco no emulador. Aparece um ✓ ou um ✗ ao lado do commit. | `.github/workflows/verifica.yml`, `testes/verifica.js`, `testes/regras/` |
| Senha da trava | Só a administradora muda ou tira a senha que trava os computadores de chamados, do posto e da oficina (antes qualquer login que grava conseguia tirar pelo console do navegador). A senha nova é guardada com 10.000 repetições, o que torna muito mais lento adivinhar a partir do banco. | `firestore.rules` (config/geral), `js/31-trava.js` |
| OneDrive | Só a administradora e o RH mudam a configuração. | `firestore.rules` |
| Erros escondidos | Erro de programa no aparelho de alguém fica registrado. A administradora vê em **Ajustes › Backup e dados › Erros do painel**. | `js/90-revisao.js`, coleção `erros` |
| Desempenho | Os apontamentos são agrupados por ordem uma vez a cada atualização (antes cada tela refazia a conta de todas as ordens com todos os apontamentos), e os redesenhos que chegam juntos do banco viram um só. | `js/01-base-producao.js`, `js/90-revisao.js` |
| Funções repetidas | Removidas 5 funções declaradas duas vezes. A verificação automática agora acusa isso. | `testes/verifica.js` |
| Esqueci a senha | Na tela de entrar: (1) quem ligou a conta Google entra por ela e cria uma senha nova; (2) quem não ligou manda um pedido, que chega à administradora em **Equipe e cargos** e no sino. | `painel-firebase.js`, `js/91-senha.js`, coleção `pedsenha` |
| Bibliotecas de fora | Cada biblioteca (Firebase, jsPDF, Excel…) tem o código de conferência (SRI). **Ainda desligado**: o GitHub precisa confirmar primeiro que os códigos batem com as CDNs (veja abaixo). | `js/sri.js`, `testes/sri.js` |
| Testes que dependiam do dia | `DATA=2026-10-20 node teste-x.js` roda o teste como se fosse aquele dia. Os testes que falhavam em fim de semana ou feriado já fixam a data. | `testes/harness.js` |

## O que a administradora precisa fazer no console

1. **Publicar as regras** – Firebase › Firestore Database › Regras: apague tudo, cole o `firestore.rules` e toque em Publicar. Sem isso, a trava continua sem proteção e os pedidos de senha e o registro de erros não gravam.
2. **Ligar o login com Google** (para o "Esqueci a senha" pelo Google):
   - Firebase › Authentication › Sign-in method › **Google** › Ativar › Salvar.
   - Firebase › Authentication › Settings › **Domínios autorizados**: confira que o endereço do painel está na lista (ex.: `cavalcante-creator.github.io`). Se mudar o endereço, acrescente o novo.
   - Depois, cada pessoa liga a própria conta Google: no painel, toque no nome no alto › **Ligar minha conta Google**.
3. **Proteger a `main` no GitHub** (Settings › Branches › Add rule › `main` › "Require status checks to pass" › escolha "Verificar o painel"). Assim, um commit que quebra o painel não entra.
4. **Repositório privado e histórico limpo** – nomes reais já estiveram no código e continuam no histórico. Limpar com `git filter-repo` (a TI ajuda) e deixar o repositório privado. **Atenção:** com repositório privado, o GitHub Pages só funciona em plano pago; a alternativa é o Firebase Hosting (podemos migrar).
5. **Segundo administrador e verificação em duas etapas** – Firebase › ⚙ › Usuários e permissões › Adicionar membro (uma conta da empresa) e duas etapas nas contas Google e GitHub.
6. **Chave de serviço dos robôs (Face ID e Focco)** – Firebase › ⚙ › Contas de serviço: apague as chaves que não são usadas. No computador do robô: usuário do Windows com senha e acesso só da TI/RH à pasta do robô.

## Quando a internet do GitHub confirmar as bibliotecas (SRI)

1. Na aba **Actions** do GitHub, abra "Verificar o painel" › trabalho **bibliotecas**.
2. Se todas as linhas dizem PASSOU: em `js/sri.js`, troque `var LIGADO = false` por `true`, e no `index.html` acrescente `integrity="…" crossorigin="anonymous"` e `?sri=1` nos `<script>` do Firebase e do jsPDF (os códigos estão em `js/sri.js`). Suba a versão do `sw.js`.
3. Se alguma diz FALHOU: o trabalho imprime o código certo de cada uma (`--novo`). Copie para o `js/sri.js` e rode de novo.
4. O trabalho roda **todo dia às 6h17**: se uma CDN trocar um arquivo, o GitHub avisa por e-mail.

## Para depois (precisa de decisão ou de plano pago)

- **App Check** (chamados sem login): hoje qualquer pessoa com o endereço do QR consegue abrir chamados (as regras já limitam os campos e o tamanho). O App Check do Firebase com reCAPTCHA bloqueia robôs: Firebase › App Check › registrar o site com reCAPTCHA v3 › passar a chave para o Claude ligar no código › depois "Aplicar" no Firestore.
- **Fotos e PDFs no Firebase Storage** em vez de texto dentro do banco (mais barato de ler e sem o limite de 1 MB por documento). O Storage exige o plano Blaze (pago por uso).
- **Ganchos no lugar dos embrulhos**: o código novo usa `depoisDoRender(fn)` (ou `Painel.depoisDoRender` nos módulos) em vez de embrulhar o `render`. Os 38 embrulhos antigos continuam e podem ser trocados aos poucos, módulo a módulo.
- **711 `catch` vazios**: o registro de erros pega o que escapa; os `catch` podem ganhar um `PainelErro(e,'onde')` aos poucos, quando cada parte for mexida.
- **Arquivos grandes** (`modulos/rh.js` tem 548 KB): dividir quando o RH for revisado.
