# Fontes

O sistema usa seis famílias em quatro papéis (`type.families` em `tokens.json`). Só quatro delas podem ser redistribuídas; as outras duas dependem de instalação local e têm um fallback definido na própria pilha de fontes.

| Papel | Família preferida | Licença | Embutida em `assets/fontes/` | Fallback real |
|---|---|---|---|---|
| `title` | **Aharoni** | Microsoft, vem com o Office — proprietária, não redistribuível | não | **Baloo 2** 700 (embutida) |
| `body` | **Hagrid Text** | Zetafonts, comercial paga — não redistribuível | não | **Nunito** 400–700 (embutida) |
| `display` | **Archivo Black** | SIL OFL 1.1 | sim | `sans-serif` do sistema |
| `label` | **Poppins** 600 / 800 | SIL OFL 1.1 | sim | `sans-serif` do sistema |

## O que está embutido

`assets/fontes/` contém os `.woff2` (subconjunto *latin* do Google Fonts, que cobre todo o português) e uma cópia da licença OFL de cada família — obrigatória para redistribuir:

```
ArchivoBlack-Regular.woff2   OFL-ArchivoBlack.txt
Baloo2-Bold.woff2            OFL-Baloo2.txt
Nunito-Variable.woff2        OFL-Nunito.txt     (fonte variável, peso 400 a 700)
Poppins-SemiBold.woff2       OFL-Poppins.txt
Poppins-ExtraBold.woff2
fontes.css                   os @font-face
```

Basta importar `assets/fontes/fontes.css` depois de `tokens.css` — é o que os modelos em `components/` fazem. Não há dependência de rede: os modelos abrem offline.

## O que depende de instalação local

**Aharoni** só existe em um estilo (Bold) e é instalada junto com o Microsoft Office no Windows e no macOS. Se estiver presente, o navegador e o PowerPoint a usam; se não, `tokens.css` cai para Baloo 2.

**Hagrid Text** é vendida pela Zetafonts. Quem monta os slides no PowerPoint precisa da licença e da fonte instalada; caso contrário o PowerPoint substitui silenciosamente por outra fonte — geralmente Calibri ou Arial, **não** Nunito. O fallback Nunito vale apenas para o que passa por CSS (os modelos HTML e as miniaturas exportadas).

## Consequências práticas

- As larguras de Aharoni ≠ Baloo 2 e de Hagrid Text ≠ Nunito. Quem não tem as fontes proprietárias verá quebras de linha diferentes das do deck original — os modelos em `components/` foram conferidos com os fallbacks, não com as fontes proprietárias.
- Nas miniaturas isso não importa: `display` (Archivo Black) e `label` (Poppins) são as duas embutidas, então a miniatura exportada sai idêntica em qualquer máquina.
- Para checar o que está sendo usado numa máquina: `fc-list | grep -iE "aharoni|hagrid"` (Linux/macOS com fontconfig) ou a lista de fontes do PowerPoint.

## Como atualizar

Os `.woff2` vieram da API do Google Fonts (`fonts.googleapis.com/css2?family=…`, subconjunto *latin*) e as licenças do repositório `google/fonts` (`ofl/<família>/OFL.txt`). Ao trocar de versão, substitua os arquivos e mantenha os nomes — `fontes.css` referencia-os pelo nome.
