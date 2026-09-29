# US. — espaço privado para dois

O frontend é estático e pode ser publicado diretamente na Vercel. A persistência partilhada usa Supabase.

## Configuração do Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Abre **SQL Editor**, cola todo o conteúdo de `supabase.sql` e executa.
3. Em **Project Settings → API**, copia a URL e a chave `anon public` para `js/config.js`.
4. Publica a pasta do projeto na Vercel como projeto estático, sem build command.

O código partilhado continua a ser o convite. Depois de entrar, cada dispositivo recebe um token de sessão; as RPCs do banco bloqueiam leituras e escritas sem esse token. A coluna `revision` evita que uma gravação antiga sobrescreva uma alteração mais recente.

## Nota de produto

O protótipo atual usa um snapshot JSON para manter a UI simples e compatível com o que já existe. O Supabase também mantém projeções estruturadas em `room_members`, `room_missions` e `xp_events`, prontas para relatórios, notificações e futuras APIs. Imagens continuam no dispositivo; para uso real entre os dois, o próximo passo é trocar o Data URL por Supabase Storage.
