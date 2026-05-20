Tema Frutiger Aero (Windows 7) — instruções

Este projeto contém um mockup visual que tenta replicar o estilo Aero do Windows 7.

Arquivos alterados
- [index.html](index.html)
- [style.css](style.css)

Como usar ícones reais do Windows (atenção a direitos autorais)
- Não é fornecido nenhum ícone proprietário aqui.
- Se você tem um Windows com os ícones instalados, copie os arquivos de ícone para a pasta `icons/` do projeto.
- Nomes recomendados (use esses nomes ou atualize o HTML):
  - `explorer.png`  — Explorador de arquivos
  - `computer.png`  — Computador
  - `network.png`   — Rede
  - `folder.png`    — Pasta/Aplicação

Como extrair/converter ícones do Windows (opções):
- Manual: abra o ícone (arquivo ICO) no Paint e salve como PNG, então coloque em `icons/`.
- Ferramenta: use um extrator de ícones local (ex.: IcoFX, IconsExtract) para exportar ícones de arquivos .exe/.dll para PNG/ICO, depois mova-os para `icons/`.
- Alternativa: procure os arquivos em `C:\Windows\System32` (ex.: `imageres.dll`, `shell32.dll`) e extraia os ícones usando uma ferramenta local.

Fonte Frutiger
- A fonte `Frutiger` é proprietária; o CSS usa `Frutiger` como primeira opção e `Segoe UI` como fallback.
- Para ver exatamente com Frutiger, instale a fonte no Windows ou substitua `font-family` em `style.css` por uma fonte instalada.

Testar localmente
1. Coloque seus ícones em `icons/` com os nomes acima.
2. Abra `index.html` no navegador (arrastar para o navegador ou `CTRL+O`).

Observação legal
- Não inclua ou redistribua ícones proprietários sem permissão. Essas instruções supõem que você está usando ícones do seu próprio sistema.

Se quiser, eu posso:
- ajustar mais pormenores visuais (bordas, brilhos, sombras);
- gerar SVGs de ícones estilo Windows 7 permissivos;
- ajudar a extrair ícones via PowerShell (posso fornecer um script breve se desejar).
