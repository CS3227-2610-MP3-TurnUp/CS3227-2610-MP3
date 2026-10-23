// Adapted from the team's MP2 document renderer; keep definitions readable offline.
const blocks = document.querySelectorAll('pre > code.language-mermaid, .language-mermaid pre > code');
if (blocks.length) {
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
    for (const [index, block] of blocks.entries()) {
      try {
        const { svg, bindFunctions } = await mermaid.render(`turnup-diagram-${index}`, block.textContent);
        const diagram = document.createElement('div');
        diagram.className = 'mermaid';
        diagram.innerHTML = svg;
        const pre = block.closest('pre');
        (pre.closest('div.highlighter-rouge') || pre).replaceWith(diagram);
        bindFunctions?.(diagram);
      } catch (error) { console.error('Unable to render diagram; its source remains visible.', error); }
    }
  } catch (error) { console.error('Unable to load Mermaid; diagram sources remain visible.', error); }
}
