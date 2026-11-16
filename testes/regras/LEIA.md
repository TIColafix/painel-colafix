# Teste das regras do banco (emulador do Firebase)

Confere o `firestore.rules` de verdade (não o Firebase simulado dos outros testes). Precisa de Java.

```bash
cd testes/regras
npm i --no-save firebase-tools@13.29.1 @firebase/rules-unit-testing@3.0.4 firebase@10.14.1
npx firebase emulators:exec --only firestore --project demo-painel "node teste-regras.mjs"
```

Cada linha imprime PASSOU ou FALHOU. Mudou uma regra? Acrescente o caso aqui antes de publicar no console.
