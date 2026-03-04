# Deploy como Static Site no Render

O frontend usa `output: "export"` e gera a pasta **out/** no build.

## Configuração no Render (Static Site)

- **Build command:**  
  - Se o repositório for só o front (ex.: Aragon-web): `npm install && npm run build`  
  - Se o repositório tiver a pasta `web/` (ex.: Aragon-app): `cd web && npm install && npm run build`

- **Publish directory:**  
  - Se você rodou o build **dentro de `web/`** (ex.: `cd web && npm run build`): use **`web/out`**  
  - Se você rodou o build na **raiz do repo** (frontend-only): use **`out`**

- **Variável de ambiente:**  
  - `NEXT_PUBLIC_API_URL` = `https://aragon-api.onrender.com` (ou a URL do seu backend)

## Vulnerabilidades npm

Antes do deploy, rode no diretório do frontend:

```bash
npm audit fix
npm run build
```

Depois confira se a pasta **out** (ou **web/out**) foi gerada e use esse caminho em **Publish directory**.
