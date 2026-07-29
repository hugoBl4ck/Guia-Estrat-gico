# Plano de Publicação Online Gratuita (Deploy PWA ERP Driver Finance) 🌐📱

Este guia apresenta o passo a passo para subir a aplicação **ERP Driver Finance** na internet **100% de graça**, com **link HTTPS seguro** e suporte a **instalação PWA em qualquer smartphone**.

---

## 🟢 Opção 1: Vercel (Recomendado - Gratuito, Instantâneo & Automático)

A Vercel é a plataforma líder mundial para hospedagem de aplicações web modernas (Vite / Next.js / React).

### Método A: Via Linha de Comando (CLI)
1. No terminal da pasta do projeto, execute:
   ```bash
   npx vercel
   ```
2. Faça login com sua conta do GitHub ou E-mail.
3. Aceite os valores padrão (`Y` a todas as perguntas).
4. Em menos de **30 segundos**, a Vercel gerará o seu link HTTPS online (ex: `https://erp-driver-finance.vercel.app`).

### Método B: Conectando com o GitHub (Deploy Automático)
1. Suba o projeto para o seu repositório no **GitHub**.
2. Acesse **[vercel.com](https://vercel.com)** e faça login com o GitHub.
3. Clique em **"Add New" $\rightarrow$ "Project"** e selecione o repositório `ERP_Motorista_App`.
4. Clique em **"Deploy"**. Toda vez que você fizer alterações no código, a Vercel atualizará o site automaticamente!

---

## 🔵 Opção 2: Netlify (Arrastar e Soltar - 100% Gratuito)

Se preferir não usar o terminal, você pode publicar o aplicativo arrastando a pasta de build!

1. Na pasta do projeto, execute o comando de compilação:
   ```bash
   npm run build
   ```
   *Isso criará a pasta `dist` com todos os arquivos otimizados.*

2. Acesse o site: **[app.netlify.com/drop](https://app.netlify.com/drop)** (faça login ou crie uma conta gratuita).
3. Arraste a pasta **`dist`** para dentro da janela do navegador.
4. O Netlify publicará o aplicativo instantaneamente e te dará um link público seguro (ex: `https://erp-driver-finance.netlify.app`).

---

## 🔒 Benefícios do Deploy Online

- **Funciona de Qualquer Lugar**: Acessível via 4G/5G/Wi-Fi no seu celular de qualquer lugar da cidade.
- **PWA Instalável no Celular**: Ao abrir o link `https://...` no celular, o Safari/Chrome oferecerá a opção de instalar o app na tela inicial.
- **Certificado SSL Gratuito**: Criptografia de ponta a ponta.
- **Domínio Próprio Opcional**: Se desejar no futuro, você pode vincular seu próprio domínio (ex: `https://erpmotorista.com.br`).
