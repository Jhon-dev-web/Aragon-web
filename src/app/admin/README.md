# Rota /admin – proteção

## Por que a proteção é apenas client-side?

No padrão atual do projeto:

1. **Onde está o token**  
   O JWT fica em `localStorage` (e em memória no cliente). Não é enviado em cookie.

2. **O que o servidor vê**  
   No App Router, o middleware e os Server Components rodam no servidor. Eles não têm acesso a `localStorage` nem ao React Context. Na requisição de navegação (GET da página), o servidor não recebe o token; ele só aparece nas chamadas de API feitas pelo cliente (header `Authorization`).

3. **Consequência**  
   Para a rota `/admin`, o servidor não consegue saber quem é o usuário nem se é admin. Por isso não dá para fazer um redirect server-side “só para não-admin” sem alterar o modelo de autenticação (por exemplo, passar a usar cookie HttpOnly definido pelo backend no login).

4. **O que está implementado**  
   - **Cliente:** checagem `isAdmin` (via `useAuth()`), redirect para `/probabilisticas` se não for admin, e nenhuma chamada a endpoints admin antes dessa validação.  
   - **Backend:** rotas `/admin/*` exigem `require_admin` (role + `ADMIN_EMAIL`).  
   Assim, mesmo que alguém acesse a URL da página, não vê dados sensíveis antes do redirect e as APIs continuam protegidas no servidor.

## Se no futuro quiser proteção server-side

Seria necessário, por exemplo:

- Backend definir um cookie HttpOnly (e, se quiser, seguro) no login com o token ou um session id.
- Next.js middleware ou um Server Component ler esse cookie e, para `/admin`, validar sessão/role (chamando a API ou decodificando um JWT em cookie) e redirecionar antes de entregar o HTML.

Isso exige mudança no fluxo de login e no armazenamento do token (não só no front, mas no backend que hoje devolve o JWT no body).
