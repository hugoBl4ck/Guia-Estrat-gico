# Guias de Publicação Online Gratuita (GiroCerto ERP) 🌐🚀

Este documento fornece o passo a passo simplificado para publicar o **GiroCerto ERP** online de forma **100% GRATUITA** com certificado HTTPS seguro ativado!

---

## ⚡ Método 1: Publicação Gratuita com Vercel (Recomendado - 1 Minuto)

1. **Abra o terminal na pasta do projeto**:
   ```bash
   cd "c:\Users\Hugo\Documents\Guia Estratégico\ERP_Motorista_App"
   ```

2. **Execute o comando de publicação com a Vercel**:
   ```bash
   npx vercel
   ```
   *(Pressione Enter para confirmar o login rápido no seu e-mail/GitHub e aceitar as configurações padrão).*

3. **Pronto!** A Vercel vai gerar o seu link online seguro HTTPS (exemplo: `https://girocerto-erp.vercel.app`).
   - O aplicativo estará acessível de qualquer celular, tablet ou computador do mundo!

---

## 🌐 Método 2: Publicação Gratuita com Netlify

1. **Gere a pasta de produção `dist`**:
   ```bash
   npm run build
   ```

2. **Arraste a pasta `dist`**:
   - Acesse [app.netlify.com/drop](https://app.netlify.com/drop)
   - Arraste a pasta `dist` (localizada em `c:\Users\Hugo\Documents\Guia Estratégico\ERP_Motorista_App\dist`) para a página do Netlify.
   - O Netlify publicará a aplicação online em 5 segundos!

---

## 🗄️ Banco de Dados Persistente Integrado

- O aplicativo já conta com o **`dbService` (IndexedDB / LocalStorage)** ativado.
- Todos os faturamentos, recargas Coelba, manutenções de pneus, parcelas do Santander e caixas virtuais ficam salvos **permanentemente** no navegador do motorista!
- Para conectar a um banco de dados em nuvem PostgreSQL/Supabase, disponibilizamos o arquivo SQL completo em [`data/schema.sql`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/data/schema.sql).
