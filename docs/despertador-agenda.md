# Despertador da agenda (cron-job.org)

O workflow `publicar-agenda.yml` deveria rodar a cada 30 min sozinho, mas o cron do GitHub não é garantido: em 29/09/2026 ele rodou só 3 vezes em 16 h, e o post das 12h só saiu porque alguém disparou à mão. O despertador é um site gratuito (cron-job.org) que "cutuca" o workflow a cada 30 min pela API do GitHub. O cron do GitHub continua lá como reserva. Se os dois rodarem juntos, o segundo espera o primeiro terminar e lê a agenda já atualizada, então nada sai em dobro.

Faça uma vez, leva uns 10 min.

## 1. Criar o token (no GitHub)

1. Abra https://github.com/settings/personal-access-tokens/new
2. **Token name:** `despertador-agenda`
3. **Expiration:** 1 ano (anote a data: quando vencer, o despertador para e o GitHub avisa por e-mail).
4. **Repository access:** "Only select repositories" → `po-para-todos-publisher`.
5. **Permissions → Repository permissions → Actions:** "Read and write". Não marque mais nada.
6. Clique em **Generate token** e copie o token (começa com `github_pat_`). Ele só aparece uma vez.

## 2. Criar o despertador (no cron-job.org)

1. Crie uma conta em https://console.cron-job.org/signup e entre.
2. Clique em **Create cronjob**.
3. Aba **Common**:
   - **Title:** `PO para Todos — agenda do Instagram`
   - **URL:** `https://api.github.com/repos/jotape-prog22/po-para-todos-publisher/actions/workflows/publicar-agenda.yml/dispatches`
   - **Execution schedule:** "Custom". Em **Minutes**, marque só `22` e `52`; em horas, dias, meses e dias da semana, deixe "Every". (22 e 52 ficam no meio dos minutos 7 e 37 do cron do GitHub: juntos, dá uma rodada a cada ~15 min.)
   - **Notify me when:** marque "execution of the cronjob fails".
4. Aba **Advanced**:
   - **Request method:** `POST`
   - **Headers:** adicione quatro:
     - `Accept` → `application/vnd.github+json`
     - `Authorization` → `Bearer ` seguido do token do passo 1 (com o espaço depois de Bearer)
     - `X-GitHub-Api-Version` → `2022-11-28`
     - `Content-Type` → `application/json`
   - **Request body:** `{"ref":"master","inputs":{"simular":"false"}}`
5. Clique em **Test run**. O esperado é **204 No Content**. Se aparecer 401 ou 403, o token está errado ou sem a permissão "Actions: Read and write". Se aparecer 404, confira a URL.
6. Clique em **Create**.

## 3. Conferir

No terminal, na pasta do projeto:
```
gh run list --workflow publicar-agenda.yml --limit 5
```
Deve aparecer uma rodada `workflow_dispatch` recente (a do Test run) com `success`. Ela é real, não simulação: se houver item vencido na agenda, ele é publicado. Nas horas seguintes, as rodadas devem aparecer a cada ~15 min.

## Quando o token vencer

O cron-job.org manda e-mail de falha (401). Refaça o passo 1 e troque o valor do header `Authorization` no despertador.
