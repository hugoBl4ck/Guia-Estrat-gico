# Guia do Banco de Dados SQL na Nuvem (Supabase / PostgreSQL) 🗄️⚡

O **GiroCerto ERP** já está com a persistência de banco de dados ativa no celular e navegador (`IndexedDB / LocalStorage`).

Para conectar a um **Banco de Dados PostgreSQL Gratuito na Nuvem (Supabase)**, siga os 3 passos simples abaixo:

---

## ⚡ Passo 1: Criar Conta Gratuita no Supabase

1. Acesse **[supabase.com](https://supabase.com)**
2. Clique em **"Start your project"** (Entrar com GitHub ou E-mail).
3. Clique em **"New Project"**, escolha um nome (ex: `girocerto-erp`) e defina uma senha de banco de dados.

---

## ⚡ Passo 2: Executar a Tabela de Banco de Dados (`data/schema.sql`)

1. No painel do Supabase, clique em **SQL Editor** no menu esquerdo.
2. Clique em **"New Query"**.
3. Copie todo o conteúdo do arquivo 📄 [`data/schema.sql`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/data/schema.sql) da sua pasta e cole no editor.
4. Clique no botão verde **"Run"**.

---

## ⚡ Passo 3: Conectar no Projeto Frontend

1. No Supabase, vá em **Project Settings -> API**.
2. Copie a **URL do Projeto** e a chave **`anon / public`**.
3. Adicione nas variáveis de ambiente na Vercel em **Settings -> Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://seusite.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sua-chave-anon`
