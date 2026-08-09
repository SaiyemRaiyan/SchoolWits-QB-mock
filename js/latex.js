/* =====================================================================
   School Wits — .tex ingest parser
   Parses the School Wits question-bank LaTeX dialect (see TEMPLATE.tex)
   into structured question records. Math itself ($...$, \(..\), \[..\])
   is left untouched so KaTeX can render it client-side.
   ===================================================================== */

const TexParse = (function(){

  /* Pull a \command{...} value, balancing nested braces. Returns null if absent. */
  function grab(src, command){
    const marker = '\\' + command + '{';
    const start = src.indexOf(marker);
    if(start === -1) return null;
    let i = start + marker.length, depth = 1;
    let out = '';
    while(i < src.length && depth > 0){
      const ch = src[i];
      if(ch === '{') depth++;
      else if(ch === '}'){ depth--; if(depth === 0) break; }
      out += ch;
      i++;
    }
    return out;
  }

  function grabAll(src, command){
    const out = [];
    let rest = src;
    let val;
    while((val = grab(rest, command)) !== null){
      out.push(val);
      const marker = '\\' + command + '{' + val + '}';
      rest = rest.slice(rest.indexOf(marker) + marker.length);
    }
    return out;
  }

  function normalizeImageKey(value){
    return String(value || '').trim().replace(/^\.\//, '').replace(/\\/g, '/').split('/').pop().toLowerCase();
  }

  function resolveImageSrc(fileRef, images){
    if(!images) return '';
    const ref = String(fileRef || '').trim();
    if(!ref) return '';
    if(images[ref]) return images[ref];
    if(/^(data:|https?:|\/\/)/i.test(ref)) return ref;

    const key = normalizeImageKey(ref);
    const exact = Object.keys(images).find(k => normalizeImageKey(k) === key);
    if(exact) return images[exact];
    const stem = key.replace(/\.[^.]+$/, '');
    const stemMatch = Object.keys(images).find(k => normalizeImageKey(k).replace(/\.[^.]+$/, '') === stem);
    return stemMatch ? images[stemMatch] : '';
  }

  /* ===================================================================
     Math-region protection.
     Real LaTeX math ($...$, \(...\), \[...\], $$...$$) must reach KaTeX
     byte-for-byte: legitimate math-mode syntax like "\\" (matrix/aligned
     row breaks), "~" (non-breaking space), "\," (thin space) and custom
     macros (\dd, \pow{2}, \dg, ...) would otherwise collide with the
     text-side conversions below (which turn "\\" into <br>, "~" into
     &nbsp;, etc.) and corrupt the math source or break KaTeX rendering.
     Every math span found in a piece of text is swapped for an inert
     placeholder token BEFORE any of those text-side conversions run, and
     swapped back verbatim once the whole (possibly recursively-nested)
     conversion for that top-level call is done. A module-level depth
     counter distinguishes the true outermost inlineToHTML() call for a
     given fragment (which owns the restore) from calls it makes of
     itself while converting nested content (e.g. \begin{ansbox} bodies),
     which must leave the placeholders alone for the outer call to
     resolve — otherwise raw math would be re-exposed to the outer call's
     *remaining* text-side steps and get corrupted anyway.
     =================================================================== */
  const __mathStore = [];
  let __mathDepth = 0;

  // Split `text` into a sequence of literal spans on the four standard
  // KaTeX auto-render delimiter pairs. An escaped "\$" is never treated
  // as a delimiter. Unbalanced/unclosed delimiters are left as plain text
  // rather than swallowing the rest of the document.
  function splitMathSegments(text){
    const segments = [];
    let textStart = 0;
    let i = 0;
    const n = text.length;
    while(i < n){
      const ch = text[i];
      if(ch === '\\' && text[i + 1] === '$'){ i += 2; continue; }
      if(ch === '\\' && (text[i + 1] === '[' || text[i + 1] === '(')){
        const closer = text[i + 1] === '[' ? '\\]' : '\\)';
        const end = text.indexOf(closer, i + 2);
        if(end !== -1){
          if(textStart < i) segments.push({ type: 'text', content: text.slice(textStart, i) });
          segments.push({ type: 'math', content: text.slice(i, end + closer.length) });
          i = end + closer.length;
          textStart = i;
          continue;
        }
      }
      if(ch === '$'){
        const isDisplay = text[i + 1] === '$';
        const marker = isDisplay ? '$$' : '$';
        let j = i + marker.length, end = -1;
        while(j < n){
          if(text[j] === '\\' && text[j + 1] === '$'){ j += 2; continue; }
          if(text.startsWith(marker, j)){ end = j; break; }
          j++;
        }
        if(end !== -1){
          if(textStart < i) segments.push({ type: 'text', content: text.slice(textStart, i) });
          segments.push({ type: 'math', content: text.slice(i, end + marker.length) });
          i = end + marker.length;
          textStart = i;
          continue;
        }
      }
      i++;
    }
    if(textStart < n) segments.push({ type: 'text', content: text.slice(textStart) });
    return segments;
  }

  // Replace every math span in `s` with an opaque placeholder token and
  // stash the original (untouched) math source for later restoration.
  // Text with no math delimiters at all is returned unchanged (cheap
  // no-op) — this is what makes nested/recursive calls on
  // already-protected text harmless.
  function protectMath(s){
    if(s.indexOf('$') === -1 && s.indexOf('\\[') === -1 && s.indexOf('\\(') === -1) return s;
    const segments = splitMathSegments(s);
    let changed = false;
    const out = segments.map(seg => {
      if(seg.type !== 'math') return seg.content;
      changed = true;
      const idx = __mathStore.length;
      __mathStore.push(seg.content);
      return '\u0000MATH' + idx + '\u0000';
    }).join('');
    return changed ? out : s;
  }

  function restoreMath(s){
    if(s.indexOf('\u0000MATH') === -1) return s;
    return s.replace(/\u0000MATH(\d+)\u0000/g, (m, i) => {
      const v = __mathStore[parseInt(i, 10)];
      return v == null ? m : v;
    });
  }

  function enumerateToHTML(body, images, labelKind){
    const items = [];
    let current = '';
    let listDepth = 0;
    let lastIndex = 0;
    const tokenRe = /\\begin\{(enumerate|parts|subparts|choices)\}(?:\[([^\]]*)\])?|\\end\{(?:enumerate|parts|subparts|choices)\}|\\item\b/g;
    let m;

    while((m = tokenRe.exec(body))){
      const token = m[0];
      if(token.startsWith('\\begin{')){
        listDepth++;
      } else if(token.startsWith('\\end{')){
        listDepth = Math.max(0, listDepth - 1);
      } else if(token.startsWith('\\item') && listDepth === 0){
        const piece = body.slice(lastIndex, m.index).trim();
        if(piece){ items.push(piece); }
        lastIndex = m.index + m[0].length;
      }
    }

    const tail = body.slice(lastIndex).trim();
    if(tail){ items.push(tail); }
    if(items.length === 0) return inlineToHTML(body, images);

    const labelSets = {
      roman: ['i','ii','iii','iv','v','vi','vii','viii','ix','x'],
      alpha: ['a','b','c','d','e','f','g','h','i','j'],
      alphaUpper: ['A','B','C','D','E','F','G','H','I','J']
    };
    const labels = labelSets[labelKind] || labelSets.alpha;
    const extraClass = labelKind === 'alphaUpper' ? ' qpart--choice' : '';
    return items.map((item, idx) => {
      // Respect an explicit \item[(i)]-style label if the author wrote one
      // (common in pasted CIE source), instead of always auto-lettering.
      let content = item;
      let explicitLabel = null;
      const bracketMatch = content.match(/^\[([^\]]*)\]\s*/);
      if(bracketMatch){
        explicitLabel = bracketMatch[1].trim();
        content = content.slice(bracketMatch[0].length);
      }
      const bodyHtml = inlineToHTML(content.replace(/^\\item\s*/,'').trim(), images);
      const labelText = explicitLabel !== null && explicitLabel !== '' ? explicitLabel : (labels[idx] || String(idx + 1));
      const labelHtml = labelKind === 'alphaUpper'
        ? escapeHTML(labelText)
        : (/^\(.*\)$/.test(labelText) ? escapeHTML(labelText) : `(${escapeHTML(labelText)})`);
      return `<div class="qpart qpart--sub${extraClass}"><span class="pmark">${labelHtml}</span><div>${bodyHtml}</div></div>`;
    }).join('');
  }

  function renderEnumerateBlocks(text, images){
    let out = '';
    let cursor = 0;
    const openRe = /\\begin\{(enumerate|parts|subparts|choices)\}(?:\[([^\]]*)\])?/g;
    let match;

    while((match = openRe.exec(text))){
      out += inlineToHTML(text.slice(cursor, match.index), images);
      const opening = match[0];
      const envName = match[1];
      const labelKind = envName === 'subparts' ? 'roman'
        : envName === 'choices' ? 'alphaUpper'
        : envName === 'parts' ? 'alpha'
        : (/\(roman\*\)/.test(match[2] || '') ? 'roman' : 'alpha');
      const contentStart = match.index + opening.length;
      const scanBody = text.slice(contentStart);
      const closeRe = /\\begin\{(?:enumerate|parts|subparts|choices)\}(?:\[([^\]]*)\])?|\\end\{(?:enumerate|parts|subparts|choices)\}/g;
      let depth = 1;
      let closeMatch;
      let found = false;

      while((closeMatch = closeRe.exec(scanBody))){
        const token = closeMatch[0];
        if(token.startsWith('\\begin{')){
          depth++;
        } else {
          depth--;
          if(depth === 0){
            const body = scanBody.slice(0, closeMatch.index);
            out += enumerateToHTML(body, images, labelKind);
            cursor = contentStart + closeMatch.index + closeMatch[0].length;
            found = true;
            break;
          }
        }
      }

      if(!found){
        out += inlineToHTML(text.slice(match.index), images);
        break;
      }
    }

    out += inlineToHTML(text.slice(cursor), images);
    return out;
  }

  // Render a bracketed/bare mark value as the standard inline mark badge,
  // e.g. "[3]" or "3" -> <span class="markbadge">[3]</span>. Returns ''
  // for an empty/blank value (nothing to show).
  function renderMarkBadge(raw){
    const cleaned = String(raw == null ? '' : raw).replace(/[\[\]]/g, '').trim();
    return cleaned ? `<span class="markbadge">[${cleaned}]</span>` : '';
  }

  // Map plain-digit exponents to real Unicode superscript characters
  // (safe as literal text both inside and outside math), falling back to
  // an HTML <sup> for anything else \pow{} is ever handed.
  const SUPERSCRIPT_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻' };
  function toSuperscript(raw){
    const val = String(raw == null ? '' : raw).trim();
    if(val && [...val].every(ch => SUPERSCRIPT_MAP[ch])) return [...val].map(ch => SUPERSCRIPT_MAP[ch]).join('');
    return val ? `<sup>${escapeHTML(val)}</sup>` : '';
  }

  // \makecell{a\\b\\c} (a package for multi-line table-cell content) —
  // inline its lines with <br>, respecting nested braces so a literal
  // "\\" inside it is never mistaken for a table row break.
  function convertMakecell(text){
    let out = text;
    let idx;
    while((idx = out.indexOf('\\makecell')) !== -1){
      let i = idx + '\\makecell'.length;
      while(out[i] === ' ') i++;
      if(out[i] === '['){
        let d = 1; i++;
        while(i < out.length && d > 0){ if(out[i] === '[') d++; else if(out[i] === ']') d--; i++; }
      }
      if(out[i] !== '{'){ break; }
      let depth = 1, start = i + 1, j = i + 1;
      while(j < out.length && depth > 0){
        if(out[j] === '{') depth++;
        else if(out[j] === '}'){ depth--; if(depth === 0) break; }
        j++;
      }
      const inner = out.slice(start, j).replace(/\\\\/g, '<br>');
      out = out.slice(0, idx) + inner + out.slice(j + 1);
    }
    return out;
  }

  // Split `str` on every top-level occurrence of `sep` (a single literal
  // character, e.g. '&') — one that sits OUTSIDE any {...} brace group.
  // Needed because table cells routinely contain \makecell{a\\b} whose
  // internal braces must not be confused with cell/row boundaries.
  function splitTopLevel(str, sep){
    const parts = [];
    let depth = 0, last = 0;
    for(let i = 0; i < str.length; i++){
      const ch = str[i];
      if(ch === '{') depth++;
      else if(ch === '}') depth = Math.max(0, depth - 1);
      else if(depth === 0 && str.startsWith(sep, i)){
        parts.push(str.slice(last, i));
        i += sep.length - 1;
        last = i + 1;
      }
    }
    parts.push(str.slice(last));
    return parts;
  }

  // Replace \command{...} using balanced-brace parsing (not a simple
  // [^}] regex), so nested content like
  // 	extbf{Accept \textit{either} form} is handled safely.
  function replaceBalancedOneArgCommand(src, command, replacer){
    const marker = '\\' + command;
    let out = '';
    let i = 0;
    while(i < src.length){
      const start = src.indexOf(marker, i);
      if(start === -1){
        out += src.slice(i);
        break;
      }
      out += src.slice(i, start);
      let j = start + marker.length;
      while(j < src.length && /\s/.test(src[j])) j++;
      if(src[j] !== '{'){
        out += marker;
        i = start + marker.length;
        continue;
      }
      let depth = 1;
      let k = j + 1;
      while(k < src.length && depth > 0){
        if(src[k] === '{') depth++;
        else if(src[k] === '}') depth--;
        k++;
      }
      if(depth !== 0){
        out += src.slice(start);
        break;
      }
      const inner = src.slice(j + 1, k - 1);
      out += replacer(inner);
      i = k;
    }
    return out;
  }

  function unwrapTextStyleCommands(src){
    let out = String(src == null ? '' : src);
    let prev;
    do {
      prev = out;
      out = replaceBalancedOneArgCommand(out, 'textbf', inner => inner);
      out = replaceBalancedOneArgCommand(out, 'textit', inner => inner);
      out = replaceBalancedOneArgCommand(out, 'underline', inner => inner);
    } while(out !== prev);
    return out;
  }

  function normalizeMarksCell(raw){
    let s = unwrapTextStyleCommands(String(raw == null ? '' : raw));
    s = s.replace(/\$/g, '');
    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /* Convert light inline markup + our custom commands into safe HTML,
     leaving TeX math delimiters intact for KaTeX auto-render. */
  function inlineToHTML(text, images){
    const isOutermost = __mathDepth === 0;
    __mathDepth++;
    try {
      return convertInline(text, images, isOutermost);
    } finally {
      __mathDepth--;
    }
  }

  function convertInline(text, images, isOutermost){
    let s = text;

    s = stripComments(s);
    s = stripPreambleCommands(s);
    s = stripBareDeclarations(s);
    s = stripLabels(s);

    // Protect real math ($...$, \(...\), \[...\], $$...$$) BEFORE any of
    // the text-side conversions below run — those conversions (line
    // breaks, ~ -> &nbsp;, dash collapsing, etc.) would otherwise mangle
    // legitimate math-mode syntax (matrix/aligned "\\" row breaks, "~",
    // "\," thin-space, custom macros like \dd / \pow{2} / \dg). Math is
    // swapped back in verbatim just before the outermost call returns.
    s = protectMath(s);

    s = convertCustomBookletMacros(s, images);

    // --- Subject-agnostic symbol/spacing macros used across the common
    // exam-paper template (Physics/Add Maths/Maths D alike). These only
    // ever run against already-math-protected text, so they can never
    // touch the same macro when it's legitimately used *inside* math
    // (KaTeX is taught the same macros via its own `macros` config).
    s = s.replace(/\\ohms\b/g, 'Ω');
    s = s.replace(/\\degC\b/g, '°C');
    s = s.replace(/\\dg\b(?:\{\})?/g, '°');
    s = s.replace(/\\pow\{([^}]*)\}/g, (m, n) => toSuperscript(n));
    s = s.replace(/\\textperiodcentered\s*\\?\s*/g, ' · ');
    s = s.replace(/\\,/g, ' ');

    s = s.replace(/\\begin\{center\}/g, '').replace(/\\end\{center\}/g, '');
    s = s.replace(/\\begin\{flush(?:left|right)\}/g, '').replace(/\\end\{flush(?:left|right)\}/g, '');

    // --- Print-only exam-booklet formatting noise ---
    // These commands exist to lay out blank space for handwritten answers
    // on a printed page. They carry no content and have no meaning in a
    // digital view, so they must be stripped/converted here rather than
    // left as raw broken-looking text like "\vspace{2cm}" or "\hrule".
    s = s.replace(/\\(?:newpage|clearpage|pagebreak)\b\*?/g, '\n\n');
    s = s.replace(/\\noindent\b/g, '');
    s = s.replace(/\\(?:bigskip|medskip|smallskip)\b/g, '\n\n');
    s = s.replace(/\\vspace\*?\{[^}]*\}/g, '');
    s = s.replace(/\\hspace\*?\{[^}]*\}/g, ' ');
    s = s.replace(/\\qquad\b/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    s = s.replace(/\\quad\b/g, '&nbsp;&nbsp;');
    // \hfill [N] → inline mark badge (must precede the \hfill strip below)
    s = s.replace(/\\hfill\s*\[(\d{1,2})\]/g, '<span class="markbadge">[$1]</span>');

    s = s.replace(/\\(?:hfill|dotfill)\b/g, '');

    // \answerline[optional width] — a printed answer-blank; remove for digital view
    s = s.replace(/\\answerline(?:\[[^\]]*\])?/g, '');

    // \rule{width}{height} used as a blank writing line — remove
    s = s.replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '');

    // \hrule sequences are printed answer-writing lines — remove for digital view
    s = s.replace(/(?:\\hrule\b\s*)+/g, '');

    // \total — the paper's own "[Total: N]" printer; the total is already
    // surfaced through the question's `marks` metadata elsewhere in the
    // UI, so this is stripped rather than duplicated as body text.
    s = s.replace(/\\total\b/g, '');

    // \markright{[N]} — a right-aligned per-part mark indicator -> badge.
    s = s.replace(/\\markright\{\s*\[?(\d{1,3})\]?\s*\}/g, '<span class="markbadge">[$1]</span>');

    // \Alines{n}{[marks]} — n blank dotted answer lines followed by a
    // mark indicator. The blank lines are print-only; only the mark
    // badge carries real content in a digital view.
    s = s.replace(/\\Alines\{\d+\}\{([^}]*)\}/g, (m, marks) => renderMarkBadge(marks));

    // \ansval{label}{unit}{marks} — "label ___ unit [marks]" answer line.
    s = s.replace(/\\ansval\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g, (m, label, unit, marks) => {
      const l = label.trim(), u = unit.trim();
      const blank = '<span class="ansblank"></span>';
      return `${l ? l + ' ' : ''}${blank}${u ? ' ' + u : ''} ${renderMarkBadge(marks)}`.trim();
    });

    // \plainline / \labelline{label} — more print-only blank-line
    // variants; keep the label text (if any), drop the blank line.
    s = s.replace(/\\plainline\b/g, '');
    s = s.replace(/\\labelline\{([^}]*)\}/g, (m, label) => label.trim());

    // Preserve literal paragraph breaks and keep list markup readable.
    s = s.replace(/\\par\s*/g, '\n\n');

    // \qfig[width]{filename}{caption} — figure with optional caption
    // (caption is very often left empty in these papers; suppress the
    // <figcaption> entirely rather than render an empty one).
    s = s.replace(/\\qfig(?:\[[^\]]*\])?\{([^}]*)\}\{([^}]*)\}/g, (m, file, cap) => {
      const src = resolveImageSrc(file, images);
      const missing = src ? '' : ' data-missing="1"';
      const capTrim = cap.trim();
      return `<figure class="qfig"${missing}><img src="${src || ''}" alt="${escapeAttr(capTrim || file.trim())}">` +
             (src ? '' : `<div class="imgmissing">Image not uploaded: ${escapeHTML(file.trim())}</div>`) +
             (capTrim ? `<figcaption>${escapeHTML(capTrim)}</figcaption>` : '') +
             `</figure>`;
    });

    // \image{filename}{caption}
    s = s.replace(/\\image\{([^}]*)\}\{([^}]*)\}/g, (m, file, cap) => {
      const src = resolveImageSrc(file, images);
      const missing = src ? '' : ' data-missing="1"';
      return `<figure class="qfig"${missing}><img src="${src || ''}" alt="${escapeAttr(cap)}">` +
             (src ? '' : `<div class="imgmissing">Image not uploaded: ${escapeHTML(file.trim())}</div>`) +
             `<figcaption>${escapeHTML(cap)}</figcaption></figure>`;
    });

    // \includegraphics[width=...]{filename}
    s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/g, (m, file) => {
      const src = resolveImageSrc(file, images);
      const missing = src ? '' : ' data-missing="1"';
      return `<figure class="qfig"${missing}><img src="${src || ''}" alt="${escapeAttr(file.trim())}">` +
             (src ? '' : `<div class="imgmissing">Image not uploaded: ${escapeHTML(file.trim())}</div>`) +
             `<figcaption>${escapeHTML(file.trim())}</figcaption></figure>`;
    });

    // 	extbf{...} \textit{...} \underline{...}
    // Use balanced-brace parsing so nested style macros are handled.
    s = replaceBalancedOneArgCommand(s, 'textbf', inner => `<b>${inner}</b>`);
    s = replaceBalancedOneArgCommand(s, 'textit', inner => `<i>${inner}</i>`);
    s = replaceBalancedOneArgCommand(s, 'underline', inner => `<u>${inner}</u>`);

    // \begin{tabular}{...} ... \end{tabular}  ->  <table class="datatable">
    // Rows/cells are split only on TOP-LEVEL \\ / & (outside any {...}
    // group) so a \makecell{a\\b} multi-line header cell can't be
    // mistaken for extra table rows.
    s = s.replace(/\\begin\{tabular\}(?:\[[^\]]*\])?\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (m, body) => {
      const rows = splitTopLevel(body, '\\\\').map(r => r.trim()).filter(Boolean);
      const trs = rows.map(r => {
        const cleaned = r.replace(/\\hline/g, '').replace(/\\cline\{[^}]*\}/g, '').trim();
        if(!cleaned) return '';
        const cells = splitTopLevel(cleaned, '&').map(c => convertMakecell(c.trim()));
        if(!cells.join('').trim()) return '';
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      }).filter(Boolean).join('');
      return `<table class="datatable">${trs}</table>`;
    });

    // \begin{itemize} \item ... \end{itemize}
    s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (m, body) => {
      const items = body.split(/\\item/).slice(1).map(t => `<li>${t.trim()}</li>`).join('');
      return `<ul class="subq-list subq-list--bullet">${items}</ul>`;
    });

    if(/\\begin\{(?:enumerate|parts|subparts|choices)\}/.test(s)){
      const rendered = renderEnumerateBlocks(s, images);
      return isOutermost ? restoreMath(rendered) : rendered;
    }

    // TeX dashes / spacing conventions commonly used in exam LaTeX
    s = s.replace(/---/g, '&mdash;').replace(/--/g, '&ndash;').replace(/~/g, '&nbsp;');

    // Blank paragraphs -> <p>, single \\[dimension] or \\ -> <br>
    // (the optional [1ex]/[4pt]/... after \\ sets extra vertical skip in
    // real LaTeX — purely a print-layout detail, so it's dropped, not
    // left dangling as visible "[1ex]" text.)
    s = s.replace(/\\\\\s*\[[^\]]*\]/g, '<br>');
    s = s.replace(/\\\\/g, '<br>');
    const paras = s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const html = paras.map(p => {
      // Trailing " [N]" patterns that remain after \hfill stripping are CIE
      // mark indicators — wrap them in a badge so they're visually distinct.
      const withBadge = p.replace(/\s+\[(\d{1,2})\]\s*$/, ' <span class="markbadge">[$1]</span>');
      return /^<(figure|ul|ol|table|div)/.test(withBadge) ? withBadge : `<p>${withBadge}</p>`;
    }).join('\n');
    return isOutermost ? restoreMath(html) : html;
  }

  function escapeHTML(s){
    return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  }
  function escapeAttr(s){ return escapeHTML(s).replace(/"/g, '&quot;'); }

  /* ===================================================================
     Support for heavily-templated exam-booklet source: real LaTeX
     preambles define their own colours/macros/environments (\definecolor,
     \newcommand, \newenvironment, \newtcolorbox, \titleformat, \pagestyle,
     \fancyhf, etc.) and then invoke them in the body (\sessionheader{},
     \qsection{}, \begin{mstab}{color}...\end{mstab}, \begin{ansbox}...).
     A regex converter can't execute macro *definitions* — but a paper's
     definitions are always the same handful of names reused everywhere,
     so we strip the definitions wholesale (they carry no content) and
     hard-code rendering for the specific macros that DO carry content.
     =================================================================== */

  // Remove LaTeX line comments ("% ..." to end of line), without eating
  // an escaped literal percent sign ("\%").
  function stripComments(s){
    return s.replace(/(^|[^\\])%.*$/gm, '$1');
  }

  // From position `idx` (just after a command name), consume every
  // immediately-following optional [...] or mandatory {...} group —
  // however many there are — and return the index right after the last
  // one. This is what lets one generic function strip \definecolor{a}{b}{c},
  // \newcommand{\x}[2]{...}, \newenvironment{y}{...}{...}, \geometry{...},
  // etc. without needing a hard-coded argument count per command.
  function consumeAdjacentGroups(src, idx){
    let i = idx;
    while(i < src.length){
      while(i < src.length && /[ \t]/.test(src[i])) i++;
      if(src[i] === '*'){ i++; continue; }
      if(src[i] === '['){
        let depth = 1; i++;
        while(i < src.length && depth > 0){
          if(src[i] === '[') depth++; else if(src[i] === ']') depth--;
          i++;
        }
        continue;
      }
      if(src[i] === '{'){
        let depth = 1; i++;
        while(i < src.length && depth > 0){
          if(src[i] === '{') depth++; else if(src[i] === '}') depth--;
          i++;
        }
        continue;
      }
      break;
    }
    return i;
  }

  // Preamble/definition commands: pure document setup, never content.
  // Strip the command name plus every argument group that follows it.
  const PREAMBLE_COMMANDS = [
    'geometry', 'usepackage', 'documentclass', 'definecolor', 'titleformat',
    'pagestyle', 'fancyhf', 'fancyhead', 'fancyfoot', 'renewcommand',
    'newcommand', 'newenvironment', 'newtcolorbox', 'newtcbox',
    'arrayrulecolor', 'markboth', 'addvspace', 'needspace', 'Needspace',
    'renewenvironment', 'setlength', 'setcounter', 'renewcommand*',
    'colorlet', 'DeclareMathOperator', 'graphicspath', 'input', 'include',
    'tableofcontents', 'newpage*'
  ];
  function stripPreambleCommands(s){
    const re = new RegExp('\\\\(?:' + PREAMBLE_COMMANDS.join('|') + ')\\b', 'g');
    let out = '';
    let last = 0;
    let m;
    while((m = re.exec(s))){
      out += s.slice(last, m.index);
      last = consumeAdjacentGroups(s, re.lastIndex);
      re.lastIndex = last;
    }
    out += s.slice(last);
    return out;
  }

  // Bare no-argument preamble/layout commands and TeX parameter
  // assignments (\hbadness=10000) — strip outright.
  function stripBareDeclarations(s){
    return s
      .replace(/\\(?:nopagebreak|allowbreak)\b\*?/g, '')
      .replace(/\\[a-zA-Z]+\s*=\s*[0-9]+(?:\.[0-9]+)?/g, '');
  }

  // \label{...} — a cross-reference anchor, never visible content.
  function stripLabels(s){
    return s.replace(/\\label\{[^}]*\}/g, '');
  }

  // Strip the whole preamble up front (before \begin{document}, or —
  // for a fragment with no \begin{document} at all — any run of
  // definition/layout commands that precedes the first piece of real
  // content). Real exam-booklet source (see cie-question-feed-spec.html)
  // routinely opens with a wall of \definecolor / \newcommand /
  // \newenvironment / \pagestyle / \hbadness=... lines; if any of that
  // leaks through unstripped it shows up as raw broken LaTeX text at the
  // top of the rendered paper, which is exactly the bug being fixed here.
  function stripDocumentPreamble(s){
    const docStart = s.indexOf('\\begin{document}');
    if(docStart !== -1){
      // Preamble commands can appear before AND after \begin{document}
      // (some booklets keep \pagestyle/\fancyhf after it) — strip
      // wholesale across the whole string, not just before this marker.
      return s;
    }
    return s;
  }

  // \begin{mstab}{colorname} <rows> \end{mstab} — a custom mark-scheme
  // table where a cell spanning multiple physical rows is written with
  // \multirow{-N}{width}{label} on the LAST row of the group (negative N
  // is the common "label flows upward" convention). A row belonging to
  // NO group instead carries its own part label directly as its first
  // cell (e.g. "2(b)(i) & 19.6 or 20 N & B1"). \altrow{color}{label} is a
  // full-width section banner (e.g. "Alternative method") that expands
  // (per its \newcommand definition) to its own \multicolumn{4}{...}{...}
  // row ending in its own \\ \hline — since that expansion isn't actually
  // executed by a regex-based converter, it's normalized to an explicit
  // \hline boundary here first so it lands in its own chunk below rather
  // than swallowing the label text of the row that follows it. Returns
  // the rows in our normal {part, answer, marks} shape (banner rows carry
  // isBanner:true instead of a real part/marks pair) for structured
  // storage.
  function parseMstabToRows(body, images){
    const normalized = body.replace(/\\altrow\{[^}]*\}\{([^}]*)\}/g, (m, label) => `\u0000ALTROW\u0000${label}\u0000\\hline`);
    const chunks = normalized
      .split(/\\hline|\\cline\{[^}]*\}/)
      .map(c => c.replace(/\\\\\s*$/, '').trim())
      .filter(Boolean);

    const rows = [];
    chunks.forEach(chunk => {
      const altMatch = chunk.match(/^\u0000ALTROW\u0000([\s\S]*)\u0000$/);
      if(altMatch){
        const label = inlineToHTML(altMatch[1].trim(), images || {}).replace(/^<p>|<\/p>$/g, '');
        rows.push({ label: null, span: 1, answer: `<strong>${label}</strong>`, marks: '', isBanner: true });
        return;
      }
      const mrMatch = chunk.match(/^\\multirow\{(-?\d+)\}\{[^}]*\}\{([^}]*)\}\s*&([\s\S]*)$/);
      let label = null, rest, span = 1;
      if(mrMatch){
        span = Math.abs(parseInt(mrMatch[1], 10)) || 1;
        label = mrMatch[2].trim();
        rest = mrMatch[3];
      } else if(/^&/.test(chunk)){
        // Blank-label continuation row of a multirow group (the label
        // sits on a different physical row via \multirow above/below).
        rest = chunk.replace(/^&/, '');
      } else {
        // Ungrouped single row: its own leading cell IS the part label.
        const cellsHere = splitTopLevel(chunk, '&');
        label = (cellsHere.shift() || '').trim();
        rest = cellsHere.join('&');
      }
      const cells = splitTopLevel(rest, '&');
      const rawAnswer = (cells[0] || '').trim();
      const marks = normalizeMarksCell(cells[1] || '');
      // Render-ready HTML for the answer cell (handles \newline, \textbf,
      // etc. that show up in real mark-scheme prose), without the
      // paragraph wrapper a table cell doesn't need.
      const answer = inlineToHTML(rawAnswer, images || {}).replace(/^<p>|<\/p>$/g, '');
      rows.push({ label, span, answer, marks });
    });

    const out = [];
    rows.forEach(r => {
      out.push({ part: '', answer: r.answer, marks: r.marks, isBanner: !!r.isBanner });
      if(r.label !== null){
        const groupStart = out.length - r.span;
        if(groupStart >= 0) out[groupStart].part = r.label;
      }
    });
    return out;
  }

  // Pull structured {part, answer, marks} rows out of every \begin{mstab}
  // block in a fragment (a mark scheme paste may contain more than one).
  // Returns [] if there's no mstab block, so the caller can fall back to
  // treating the text as freeform.
  function extractMstabRows(rawSrc, images){
    const s = stripComments(String(rawSrc || ''));
    const rows = [];
    const re = /\\begin\{mstab\}\{[^}]*\}([\s\S]*?)\\end\{mstab\}/g;
    let m;
    while((m = re.exec(s))){
      rows.push(...parseMstabToRows(m[1], images));
    }
    return rows;
  }

  // Pull rendered HTML out of every \begin{ansbox}{color} ... \end{ansbox}
  // block in a fragment — this is the "exemplar" content in the raw
  // CIE-booklet dialect. Returns '' if none found.
  function extractAnsboxHTML(rawSrc, images){
    const s = stripComments(String(rawSrc || ''));
    const re = /\\begin\{ansbox\}\{[^}]*\}([\s\S]*?)\\end\{ansbox\}/g;
    const parts = [];
    let m;
    while((m = re.exec(s))){
      parts.push(inlineToHTML(m[1].trim(), images || {}));
    }
    return parts.join('\n');
  }

  function convertCustomBookletMacros(s, images){
    // \sessionheader{code}{date}{title} -> a banner
    s = s.replace(/\\sessionheader\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g, (m, a, b, c) => {
      return `<div class="sessionbanner"><div class="sessionbanner-code">${inlineToHTML(a.trim(), images).replace(/^<p>|<\/p>$/g, '')} &middot; ${escapeHTML(b.trim())}</div><div class="sessionbanner-title">${escapeHTML(c.trim())}</div></div>`;
    });

    // \qsection{title} -> a section heading
    s = s.replace(/\\qsection\{([^}]*)\}/g, (m, title) => `<h3 class="qsection-heading">${escapeHTML(title.trim())}</h3>`);

    // \begin{ansbox}{colorname} ... \end{ansbox} -> exemplar-style box
    s = s.replace(/\\begin\{ansbox\}\{[^}]*\}([\s\S]*?)\\end\{ansbox\}/g, (m, body) => {
      return `<div class="exemplar-box">${inlineToHTML(body.trim(), images)}</div>`;
    });

    // \begin{mstab}{colorname} ... \end{mstab} -> real table
    s = s.replace(/\\begin\{mstab\}\{[^}]*\}([\s\S]*?)\\end\{mstab\}/g, (m, body) => {
      const rows = parseMstabToRows(body, images);
      const trs = rows.map(r => `<tr><td>${escapeHTML(r.part)}</td><td>${r.answer}</td><td>${escapeHTML(r.marks)}</td></tr>`).join('');
      return `<table class="mstable"><thead><tr><th>Part</th><th>Answer</th><th>Marks</th></tr></thead><tbody>${trs}</tbody></table>`;
    });

    // \newline -> line break (distinct from the tabular row-break \\)
    s = s.replace(/\\newline\b/g, '<br>');

    return s;
  }

  /* Parse \part{marks} text ... into the qpart HTML used by the card UI. */
  function partsToHTML(qtextRaw, images){
    // split on top-level \part{n}
    const chunks = qtextRaw.split(/\\part\{(\d+)\}/);
    if(chunks.length === 1){
      return inlineToHTML(qtextRaw, images);
    }
    let out = inlineToHTML(chunks[0], images);
    const letters = 'abcdefghij';
    for(let i = 1, n = 0; i < chunks.length; i += 2, n++){
      const marks = chunks[i];
      const body = chunks[i + 1] || '';
      out += `<div class="qpart"><span class="pmark">(${letters[n] || n+1})</span><div>${inlineToHTML(body, images)}<span class="marktag">${marks}</span></div></div>`;
    }
    return out;
  }

  /**
   * Render a single pasted LaTeX fragment (no \documentclass, no
   * \begin{document} needed — copy-pasted straight out of a source file)
   * into display HTML. Unlike the two-file ingest pipeline, images are
   * matched to \includegraphics occurrences by UPLOAD ORDER, not filename —
   * pasted source almost never references a file the poster actually has
   * (different extension, different machine), so position in the text is
   * the only reliable signal. Returns { html, imageCount, imageRefs }
   * where imageRefs[i] is the filename text referenced by the (i+1)-th
   * \includegraphics, so the caller can show "which upload maps to which
   * placeholder" and flag any that have no matching upload yet.
   */
  function parseFragment(rawSrc, orderedImages, opts){
    opts = Object.assign({}, opts || {});
    let s = String(rawSrc == null ? '' : rawSrc).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

    s = stripComments(s);

    // Defensively strip an accidentally-pasted full document wrapper —
    // the whole point of this composer is that none of this is required.
    s = s.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/g, '')
         .replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/g, '')
         .replace(/\\begin\{document\}/g, '')
         .replace(/\\end\{document\}/g, '');

    // Strip real-world preamble noise (colour/macro/environment
    // *definitions*, page-style setup, TeX parameter tweaks) — these are
    // declarations, not content, and have no rendering of their own.
    s = stripPreambleCommands(s);
    s = stripBareDeclarations(s);
    s = stripLabels(s);

    const imageRefs = [];
    const orderedImageMap = {};
    let ord = 0;
    s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/g, (m, file) => {
      ord++;
      const key = `__ord_${ord}__`;
      imageRefs.push(file.trim());
      if(orderedImages && orderedImages[ord - 1]) orderedImageMap[key] = orderedImages[ord - 1];
      return `\\image{${key}}{}`;
    });

    const html = partsToHTML(s.trim(), orderedImageMap);
    return { html, imageCount: ord, imageRefs };
  }

  function markSchemeRows(msBlock){
    const rows = [];
    const re = /\\row\{([^}]*)\}\{([\s\S]*?)\}\{([^}]*)\}/g;
    let m;
    while((m = re.exec(msBlock))){
      rows.push({ part: m[1].trim(), answer: m[2].trim(), marks: m[3].trim() });
    }
    return rows;
  }

  function totalMarksFromRows(rows){
    let total = 0;
    rows.forEach(row => {
      const m = String(row.marks || '').match(/(\d+)/);
      if(m) total += parseInt(m[1], 10);
    });
    return total ? String(total) : '';
  }

  function between(src, startTag, endTag){
    const s = src.indexOf(startTag);
    if(s === -1) return null;
    const e = src.indexOf(endTag, s + startTag.length);
    if(e === -1) return null;
    return src.slice(s + startTag.length, e);
  }

  function stripPreamble(src){
    const docStart = src.indexOf('\\begin{document}');
    const docEnd = src.indexOf('\\end{document}');
    if(docStart !== -1 && docEnd !== -1 && docEnd > docStart){
      return src.slice(docStart + '\\begin{document}'.length, docEnd);
    }
    return src;
  }

  function extractQuestionBlocks(src){
    const blocks = [];
    const qRe = /\\begin\{question\}\{(\d+)\}([\s\S]*?)\\end\{question\}/g;
    let m;
    while((m = qRe.exec(src))){
      blocks.push({ id: parseInt(m[1], 10), body: m[2], source: 'custom' });
    }
    return blocks;
  }

  // Clean a raw LaTeX fragment down to plain display text — used for
  // metadata values (topics, paper refs) that are never expected to
  // contain real math or structural markup, just the odd escaped
  // character (e.g. "Logarithmic \& Exponential Functions").
  function cleanPlainText(raw){
    return String(raw == null ? '' : raw)
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\_/g, '_')
      .replace(/\\textperiodcentered\b/g, '·')
      .replace(/\\,/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Split a \examq{...}{...}{TOPICS}{...} 3rd-argument value into its
  // individual topic strings. Multiple topics are joined in the source
  // with "\textperiodcentered\ " (a centred-dot separator), e.g.
  // "Motion or Kinematics \textperiodcentered\ Forces or Dynamics".
  function splitTopics(raw){
    return String(raw == null ? '' : raw)
      .split(/\\textperiodcentered\s*\\?\s*/)
      .map(t => cleanPlainText(t))
      .filter(Boolean);
  }

  // The common per-question template header used across every subject
  // sample analysed (Physics/Additional Maths/Maths D, both MCQ and
  // structured papers, question AND answer files alike):
  //   \examq{paper-id}{number}{topic \textperiodcentered\ topic ...}{marks}
  // This single, unambiguous marker is now the PRIMARY question-boundary
  // dialect: every block runs from one \examq{...} call to the next (or
  // end of document), and its four arguments give reliable, structured
  // paper-ref/id/topic/marks metadata directly — no guessing needed, and
  // the exact same call appears in both the question paper and the
  // answers file, so both sides key together perfectly by design.
  function extractExamqBlocks(src){
    const blocks = [];
    const re = /\\examq\{([^}]*)\}\{(\d+)\}\{([^}]*)\}\{([^}]*)\}/g;
    const marks = [];
    let m;
    while((m = re.exec(src))){
      marks.push({
        ref: cleanPlainText(m[1]),
        id: parseInt(m[2], 10),
        topicRaw: m[3],
        marksVal: cleanPlainText(m[4]),
        start: m.index,
        contentStart: m.index + m[0].length
      });
    }
    if(marks.length === 0) return blocks;
    marks.forEach((mk, i) => {
      const end = (i + 1 < marks.length) ? marks[i + 1].start : src.length;
      const body = src.slice(mk.contentStart, end);
      blocks.push({
        id: mk.id, body, source: 'examq',
        ref: mk.ref, topics: splitTopics(mk.topicRaw), marks: mk.marksVal
      });
    });
    return blocks;
  }

  // Alternative extraction path for raw CIE-style "exam booklet" source
  // that never uses our \begin{question}{n} tag at all — instead each
  // question/answer is introduced with \qsection{...some text ending in
  // "Qn"...} followed by freeform content (often \begin{mstab}...\end{mstab}
  // mark-scheme tables and/or \begin{ansbox}...\end{ansbox} exemplar
  // boxes) up to the next \qsection or the end of the document. This is
  // exactly the shape produced by real past-paper "mark scheme & model
  // answers" booklets (see cie-question-feed-spec.html for the format
  // this mirrors) — without this path, pasting one of those documents
  // into the two-file uploader found zero \begin{question} blocks and
  // the raw LaTeX source fell straight through to the screen unrendered.
  function extractQsectionBlocks(src){
    const blocks = [];
    const re = /\\qsection\{([^}]*)\}/g;
    const marks = [];
    let m;
    while((m = re.exec(src))){
      marks.push({ title: m[1], start: m.index, contentStart: m.index + m[0].length });
    }
    if(marks.length === 0) return blocks;
    marks.forEach((mk, i) => {
      const end = (i + 1 < marks.length) ? marks[i + 1].start : src.length;
      const body = src.slice(mk.contentStart, end);
      const idMatch = mk.title.match(/Q(\d+)\s*$/i) || mk.title.match(/(\d+)\s*$/);
      const id = idMatch ? parseInt(idMatch[1], 10) : (i + 1);
      blocks.push({ id, body, title: mk.title.trim(), source: 'qsection' });
    });
    return blocks;
  }

  function extractEnumerateQuestions(src){
    const body = stripPreamble(src);
    const questions = [];

    // Look for the outer enumerate that contains the questions
    const listRe = /\\begin\{enumerate\}(?:\[.*?\])?/g;
    let match = listRe.exec(body);
    if (!match) return [];

    const start = match.index + match[0].length;
    
    // Find the matching \end{enumerate} at the same depth
    let depth = 1;
    const searchRe = /\\begin\{enumerate\}(?:\[.*?\])?|\\end\{enumerate\}/g;
    searchRe.lastIndex = start;
    let end = -1;
    let m;
    while((m = searchRe.exec(body))){
      if (m[0].startsWith('\\begin')) depth++;
      else depth--;
      if (depth === 0) {
        end = m.index;
        break;
      }
    }

    if(start === -1 || end === -1 || end <= start){ return []; }

    const content = body.slice(start, end);
    
    // Split by \item at depth 0
    const itemRegex = /\\begin\{enumerate\}(?:\[.*?\])?|\\end\{enumerate\}|\\item\b/g;
    let listDepth = 0;
    let lastIndex = 0;
    let currentId = 0;

    while((m = itemRegex.exec(content))){
      const token = m[0];
      if(token.startsWith('\\begin')){
        listDepth++;
      } else if(token.startsWith('\\end')){
        listDepth = Math.max(0, listDepth - 1);
      } else if(token === '\\item' && listDepth === 0){
        const preceding = content.slice(lastIndex, m.index).trim();
        if(preceding){
          currentId++;
          questions.push({ id: currentId, body: preceding, source: 'enumerate' });
        }
        lastIndex = m.index + m[0].length;
      }
    }

    const tail = content.slice(lastIndex).trim();
    if(tail){
      currentId++;
      questions.push({ id: currentId, body: tail, source: 'enumerate' });
    }

    return questions.filter(q => q.body && /\S/.test(q.body));
  }

  // Third real-world dialect: raw CIE question-paper source that uses
  // NONE of our tags (no \begin{question}, no \qsection, no
  // \begin{enumerate} around the questions) — each question is simply
  // introduced with a bold top-level number, e.g. "\textbf{1} \quad A
  // ball is dropped..." with \newpage between questions and a trailing
  // "\hfill [Total: 10]" marker (see the real past-paper .tex files this
  // mirrors). Without this path these files fell through to the generic
  // fallback below, which showed the ENTIRE unsplit file — preamble,
  // \definecolor/\newcommand noise and all — as one giant "question",
  // which is exactly the "everything mixing up" bug being fixed here.
  function extractNumberedQuestions(src){
    const body = stripPreamble(src);
    const marks = [];
    // A question start = a bold bare integer ("\textbf{12}", never
    // "\textbf{(a)}" style part labels) sitting at the start of a
    // paragraph — right after \newpage, a blank line, or the very start
    // of the body. This is what distinguishes a top-level question
    // number from an in-body \textbf{(a)} / \textbf{(i)} part label.
    // Scanned manually (rather than one combined regex) so leading/
    // trailing whitespace around \newpage and blank lines doesn't have
    // to be matched exactly.
    const tokenRe = /\\textbf\{(\d{1,3})\}/g;
    let m;
    while((m = tokenRe.exec(body))){
      const before = body.slice(0, m.index);
      const isStart = before.trim() === '';
      const endsWithNewpage = /\\newpage\*?[ \t]*\n?[ \t]*$/.test(before);
      const endsWithBlankLine = /\n[ \t]*\n[ \t]*$/.test(before);
      if(isStart || endsWithNewpage || endsWithBlankLine){
        marks.push({ id: parseInt(m[1], 10), start: m.index });
      }
    }
    if(marks.length === 0) return [];
    const questions = [];
    marks.forEach((mk, i) => {
      const end = (i + 1 < marks.length) ? marks[i + 1].start : body.length;
      const content = body.slice(mk.start, end).replace(/\\newpage\*?\s*$/, '').trim();
      if(content) questions.push({ id: mk.id, body: content, source: 'numbered' });
    });
    return questions;
  }

  /* Find \begin{question}{n} openings that never got matched by
     extractQuestionBlocks — almost always because the matching
     \end{question} is missing (a common mistake: adding a single
     \begin{document}/\end{document} around the whole file and forgetting
     that each question ALSO needs its own \end{question}). */
  function findUnclosedQuestionOpens(src, matchedBlocks){
    const openRe = /\\begin\{question\}\{(\d+)\}/g;
    const matchedIds = new Set(matchedBlocks.map(b => b.id));
    const seen = new Set();
    const unclosed = [];
    let m;
    while((m = openRe.exec(src))){
      const id = parseInt(m[1], 10);
      if(!matchedIds.has(id) && !seen.has(id)){
        seen.add(id);
        unclosed.push(id);
      }
    }
    return unclosed;
  }

  function parse(src, images, opts){
    const warnings = [];
    images = images || {};
    // Normalize line endings and strip a leading BOM — harmless for
    // well-formed files, but avoids silent parse failures on files saved
    // by editors that use CRLF or add a UTF-8 BOM.
    src = String(src == null ? '' : src).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    opts = Object.assign({ expectQtext: true, expectMarkscheme: true, expectExemplar: true, label: 'file' }, opts || {});

    // Strip comments and preamble/definition noise (\definecolor,
    // \newcommand, \newenvironment, \pagestyle, \hbadness=..., etc.)
    // from the WHOLE source up front. Real exam-booklet .tex commonly
    // opens with a wall of this before any content — if it isn't
    // stripped here it leaks through as raw broken LaTeX text in the
    // rendered output (the exact bug reported: \definecolor{...},
    // \newenvironment{mstab}..., \hbadness=10000 showing up verbatim).
    // \subject{...} etc. are grabbed from the ORIGINAL (unstripped) src
    // below, before this happens, so metadata extraction is unaffected.
    const rawSrcForMeta = src;
    src = stripComments(src);
    src = stripPreambleCommands(src);
    src = stripBareDeclarations(src);
    src = stripLabels(src);

    const paperMeta = {
      subject: grab(rawSrcForMeta, 'subject') || '',
      subjectCode: grab(rawSrcForMeta, 'subjectcode') || '',
      paper: grab(rawSrcForMeta, 'paper') || '',
      variant: grab(rawSrcForMeta, 'variant') || '',
      session: grab(rawSrcForMeta, 'session') || '',
      year: grab(rawSrcForMeta, 'year') || ''
    };
    const hasAnyMeta = Object.values(paperMeta).some(Boolean);
    if(hasAnyMeta){
      ['subject', 'paper', 'variant', 'session', 'year'].forEach(k => {
        if(!paperMeta[k]) warnings.push(`Missing \\${k}{...} at the top of the ${opts.label}.`);
      });
    }

    const questions = [];
    const customBlocks = extractQuestionBlocks(src);

    // If the file clearly uses our \begin{question}{n} tag but one or more
    // of them never closed with \end{question}, say so specifically —
    // this is much more actionable than a generic "no questions found".
    const unclosedIds = findUnclosedQuestionOpens(src, customBlocks);
    if(unclosedIds.length){
      warnings.push(
        `Found \\begin{question}{${unclosedIds.join('}, \\begin{question}{')}} in the ${opts.label} with no matching ` +
        `\\end{question} right after it. Every \\begin{question}{n} needs its own \\end{question} — the file's single ` +
        `\\end{document} at the very bottom only closes the file, not individual questions.`
      );
    }

    const enumerateBlocks = extractEnumerateQuestions(src);
    const examqBlocks = extractExamqBlocks(src);
    const qsectionBlocks = extractQsectionBlocks(src);
    const numberedBlocks = extractNumberedQuestions(src);
    // \examq{...}{...}{...}{...} is the common template's unambiguous
    // per-question marker — tried first (before the older custom-tag,
    // enumerate, qsection and raw-numbered dialects) since a real file
    // using it will never also match those, and it carries the most
    // reliable structured metadata (ref/topics/marks straight from its
    // own arguments, no guessing required).
    const blocks = customBlocks.length ? customBlocks
      : (examqBlocks.length ? examqBlocks
      : (enumerateBlocks.length ? enumerateBlocks
      : (qsectionBlocks.length ? qsectionBlocks : numberedBlocks)));

    blocks.forEach(item => {
      const id = item.id;
      const block = item.body;

      if(item.source === 'examq'){
        // The common template: block runs from this \examq{...} call to
        // the next. Question-paper bodies are plain content (prose,
        // \begin{parts}/\begin{subparts}/\begin{choices}, \qfig, marks
        // indicators) — all handled generically by inlineToHTML/
        // partsToHTML. Answer-file bodies instead hold a
        // \begin{mstab}...\end{mstab} mark scheme and/or a
        // \begin{ansbox}...\end{ansbox} exemplar; both are extracted the
        // same way as the qsection dialect, but metadata (topic/marks/
        // ref) here comes straight from \examq's own arguments rather
        // than being guessed.
        const markRows = extractMstabRows(block, images);
        const exemplarHTML = extractAnsboxHTML(block, images);
        const leftover = block
          .replace(/\\begin\{mstab\}(?:\[[^\]]*\])?\{[^}]*\}[\s\S]*?\\end\{mstab\}/g, '')
          .replace(/\\begin\{ansbox\}\{[^}]*\}[\s\S]*?\\end\{ansbox\}/g, '')
          .trim();
        const qHTML = leftover ? partsToHTML(leftover, images) : '';

        if(opts.expectMarkscheme && !markRows.length) warnings.push(`Question ${id}: no \\begin{mstab}...\\end{mstab} mark scheme found in the ${opts.label}.`);
        if(opts.expectExemplar && !exemplarHTML) warnings.push(`Question ${id}: no \\begin{ansbox}...\\end{ansbox} exemplar found in the ${opts.label}.`);
        if(opts.expectQtext && !qHTML) warnings.push(`Question ${id}: no readable question text found in the ${opts.label} — only a mark scheme/exemplar was found. This is expected for an answers-only booklet.`);

        questions.push({
          id,
          topic: item.topics.join(' · '),
          topics: item.topics,
          marks: item.marks || totalMarksFromRows(markRows) || '',
          ref: item.ref ? `${item.ref} — Q${id}` : '',
          qText: leftover.replace(/\s+/g, ' ').trim().slice(0, 4000),
          qHTML,
          hasQtext: !!qHTML,
          markScheme: markRows,
          exemplarHTML,
          videoId: ''
        });
        return;
      }

      if(item.source === 'custom'){
        const topic = (grab(block, 'topic') || '').trim();
        const marks = (grab(block, 'marks') || '').trim();
        const ref = (grab(block, 'ref') || '').trim();

        const qTextRaw = between(block, '\\qtext', '\\endq');
        const msRaw = between(block, '\\markscheme', '\\endms');
        const exRaw = between(block, '\\exemplar', '\\endexemplar');
        let parsedMarkRows = msRaw ? markSchemeRows(msRaw) : [];
        // Some booklets write the mark scheme as a \begin{mstab}...\end{mstab}
        // table instead of \row{}{}{} lines — try that shape too before
        // giving up and warning "no mark scheme".
        if(parsedMarkRows.length === 0 && msRaw && /\\begin\{mstab\}/.test(msRaw)){
          parsedMarkRows = extractMstabRows(msRaw, images);
        }

        let exemplarHTML = exRaw ? inlineToHTML(exRaw.trim(), images) : '';
        // Likewise, an exemplar written as \begin{ansbox}{colour}...\end{ansbox}
        // rather than a plain \exemplar...\endexemplar block.
        if(!exemplarHTML && /\\begin\{ansbox\}/.test(block)){
          exemplarHTML = extractAnsboxHTML(block, images);
        }

        if(opts.expectQtext && qTextRaw === null) warnings.push(`Question ${id}: missing \\qtext ... \\endq block in the ${opts.label}.`);
        if(opts.expectQtext && !topic) warnings.push(`Question ${id}: missing \\topic{...} — it will show as "Uncategorised".`);
        if(opts.expectQtext && !marks) warnings.push(`Question ${id}: missing \\marks{...}.`);
        if(opts.expectMarkscheme && !parsedMarkRows.length) warnings.push(`Question ${id}: missing \\markscheme ... \\endms block in the ${opts.label}.`);
        if(opts.expectExemplar && !exemplarHTML) warnings.push(`Question ${id}: missing \\exemplar ... \\endexemplar block in the ${opts.label}.`);

        questions.push({
          id,
          topic: topic || '',
          marks: marks || totalMarksFromRows(parsedMarkRows) || '',
          ref: ref || '',
          qText: (qTextRaw || '').replace(/\s+/g, ' ').trim().slice(0, 4000),
          qHTML: qTextRaw !== null ? partsToHTML(qTextRaw.trim(), images) : '',
          hasQtext: qTextRaw !== null,
          markScheme: parsedMarkRows,
          exemplarHTML: exemplarHTML,
          videoId: ''
        });
        return;
      }

      if(item.source === 'qsection'){
        // Raw exam-booklet dialect: no \begin{question}{n} tag at all.
        // The block is whatever sat between this \qsection{...} and the
        // next one — usually a \begin{mstab} mark-scheme table and/or a
        // \begin{ansbox} exemplar, sometimes plain qtext-like prose too.
        const markRows = extractMstabRows(block, images);
        const exemplarHTML = extractAnsboxHTML(block, images);
        // Whatever's left over (not inside mstab/ansbox) is rendered as
        // general content — covers plain-prose qsection bodies, and any
        // custom macros elsewhere in the block (sessionheader, etc.).
        const leftover = block
          .replace(/\\begin\{mstab\}\{[^}]*\}[\s\S]*?\\end\{mstab\}/g, '')
          .replace(/\\begin\{ansbox\}\{[^}]*\}[\s\S]*?\\end\{ansbox\}/g, '')
          .trim();
        const qHTML = leftover ? inlineToHTML(leftover, images) : '';

        if(opts.expectMarkscheme && !markRows.length) warnings.push(`Question ${id} (${item.title}): no \\begin{mstab}...\\end{mstab} mark scheme found in the ${opts.label}.`);
        if(opts.expectExemplar && !exemplarHTML) warnings.push(`Question ${id} (${item.title}): no \\begin{ansbox}...\\end{ansbox} exemplar found in the ${opts.label}.`);
        if(opts.expectQtext && !qHTML) warnings.push(`Question ${id} (${item.title}): no readable question text found in the ${opts.label} — only a mark scheme/exemplar was found. This is expected for an answers-only booklet.`);

        questions.push({
          id,
          topic: '',
          marks: totalMarksFromRows(markRows) || '',
          ref: item.title || '',
          qText: leftover.replace(/\s+/g, ' ').trim().slice(0, 4000),
          qHTML,
          hasQtext: !!qHTML,
          markScheme: markRows,
          exemplarHTML,
          videoId: ''
        });
        return;
      }

      if(item.source === 'numbered'){
        // Raw exam-booklet question-paper dialect: no custom tags at all,
        // just a bold question number followed by freeform prose, parts
        // (\textbf{(a)}, \textbf{(i)}...), figures and answer-space noise
        // (\answerline, \hrule, \vspace) — all already handled generically
        // by inlineToHTML/partsToHTML. Total marks come from the paper's
        // own "\hfill [Total: N]" marker when present.
        const totalMatch = block.match(/\[\s*Total:\s*(\d+)\s*\]/i);
        // Strip the "\hfill [Total: N]" marker (and any bare "[Total: N]"
        // left after \hfill removal) from the body so it doesn't show up
        // as leftover text under the last part.
        const bodyForHTML = block.replace(/\[\s*Total:\s*\d+\s*\]/i, '');
        const qHTML = partsToHTML(bodyForHTML, images);
        if(opts.expectQtext && !qHTML) warnings.push(`Question ${id}: no readable content found in the ${opts.label}.`);
        questions.push({
          id,
          topic: '',
          marks: totalMatch ? totalMatch[1] : '',
          ref: '',
          qText: block.replace(/\s+/g, ' ').trim().slice(0, 4000),
          qHTML,
          hasQtext: !!qHTML,
          markScheme: [],
          exemplarHTML: '',
          videoId: ''
        });
        return;
      }

      const topic = (grab(block, 'topic') || grab(src, 'topic') || '').trim();
      const cleaned = block
        .replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/g, '')
        .replace(/\\begin\{enumerate\}(?:\[.*?\])?/g, '')
        .replace(/\\end\{enumerate\}/g, '')
        .replace(/\\item\b/g, '')
        .replace(/\\label\{[^}]+\}/g, '')
        .replace(/\\textit\{([^}]*)\}/g, '$1')
        .replace(/\\textbf\{([^}]*)\}/g, '$1')
        .replace(/\\underline\{([^}]*)\}/g, '$1')
        .replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}/g, '')
        .replace(/\\\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const qTextRaw = cleaned || block;

      if(opts.expectQtext && !qTextRaw) warnings.push(`Question ${id}: no readable content found in the ${opts.label}.`);

      questions.push({
        id,
        topic: topic || '',
        marks: '',
        ref: '',
        qText: qTextRaw.replace(/\s+/g, ' ').trim().slice(0, 4000),
        qHTML: partsToHTML(block, images),
        hasQtext: true,
        markScheme: [],
        exemplarHTML: '',
        videoId: ''
      });
    });

    if(questions.length === 0){
      warnings.push(`No question blocks were found in the ${opts.label}.`);
    }

    return { paperMeta, questions, warnings };
  }

  function mergeQuestionsAndAnswers(qParsed, aParsed){
    const warnings = [...qParsed.warnings];
    const aById = new Map((aParsed ? aParsed.questions : []).map(q => [q.id, q]));
    const seenAnswerIds = new Set();
    const merged = [];

    qParsed.questions.forEach(q => {
      const a = aById.get(q.id);
      if(a) seenAnswerIds.add(q.id);
      if(!a && aParsed){
        warnings.push(`Question ${q.id}: no matching \\begin{question}{${q.id}} block found in the answers file — it will show "no mark scheme uploaded".`);
      }
      merged.push({
        id: q.id,
        topic: q.topic || (a && a.topic) || 'Uncategorised',
        topics: (q.topics && q.topics.length) ? q.topics : ((a && a.topics && a.topics.length) ? a.topics : []),
        marks: q.marks || (a && a.marks) || '',
        ref: q.ref || (a && a.ref) || '',
        qText: q.qText,
        qHTML: q.qHTML,
        markScheme: (a && a.markScheme.length) ? a.markScheme : (q.markScheme || []),
        exemplarHTML: (a && a.exemplarHTML) ? a.exemplarHTML : (q.exemplarHTML || ''),
        videoId: ''
      });
    });

    if(aParsed){
      aParsed.questions.forEach(a => {
        if(seenAnswerIds.has(a.id)) return;
        warnings.push(`Question ${a.id}: found in the answers file but has no matching question in the questions file — skipped.`);
      });
      warnings.push(...aParsed.warnings.filter(w => !/No \\begin\{question\}/.test(w) || aParsed.questions.length === 0));

      ['subject', 'paper', 'variant', 'session', 'year'].forEach(k => {
        const qv = qParsed.paperMeta[k], av = aParsed.paperMeta[k];
        if(qv && av && String(qv).trim().toLowerCase() !== String(av).trim().toLowerCase()){
          warnings.push(`Paper info mismatch on "${k}": questions file says "${qv}", answers file says "${av}". Using "${qv}".`);
        }
      });
    }

    const paperMeta = Object.assign({}, aParsed ? aParsed.paperMeta : {}, Object.fromEntries(
      Object.entries(qParsed.paperMeta).filter(([, v]) => v)
    ));

    merged.sort((x, y) => x.id - y.id);
    return { paperMeta, questions: merged, warnings };
  }

  return { parse, mergeQuestionsAndAnswers, parseFragment, extractMstabRows, extractAnsboxHTML, grab, grabAll };

})();

if(typeof module !== 'undefined') module.exports = TexParse;