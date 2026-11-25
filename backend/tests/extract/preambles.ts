/**
 * Real preamble definitions, copied verbatim from the papers named below.
 *
 * A fixture in these tests is a real excerpt from the body of a paper; these
 * are the definitions that paper's own file gives the commands it uses. Only
 * the definitions a question body needs are kept (no page head, no logo).
 */

/** 4037_s16_qp_12.tex */
export const MATHS = String.raw`\documentclass[11pt,a4paper]{article}
\renewcommand{\rmdefault}{ptm}\renewcommand{\familydefault}{\rmdefault}
\frenchspacing
\spaceskip=2.875bp plus 2.85bp minus 1.2bp
\xspaceskip=2.875bp plus 2.85bp minus 1.2bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{11.5bp}{13bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{\textdegree}
\newcommand{\degC}{\textdegree C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{5.2bp}[0pt][0pt]{\fontsize{8.05bp}{8.05bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-4.0bp}[0pt][0pt]{\fontsize{8.05bp}{8.05bp}\selectfont #1}}
\newcommand{\stack}[3][5.34/2.66/8]{\sw@stack#1\relax{#2}{#3}}
\def\sw@stack#1/#2/#3\relax#4#5{\begingroup\fontsize{#3bp}{#3bp}\selectfont
  \setbox0=\hbox{#4}\setbox2=\hbox{#5}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{#1bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0\hss}}}%
  \raisebox{-#2bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2\hss}}\endgroup}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.44bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\sw@place{#1}{\sw@curx}{545.7}}
\newcommand{\row}[3]{\sw@place{#1}{#2}{545.7}#3}
\newcommand{\lab}[2]{\llap{\makebox[#1bp][l]{\strut #2}}\ignorespaces}
\def\swdots{\leavevmode\cleaders\hb@xt@ 2.875bp{\hss.\hss}\hfill\kern\z@}
\newcommand{\dotgrid}[3]{\par\gdef\sw@gfirst{#1}\gdef\sw@glast{#2}\gdef\sw@gpitch{#3}%
  \global\sw@gridtrue}
\def\sw@post#1[#2]#3\sw@nil{%
  \ifx\relax#1\relax\else{\ignorespaces#1\unskip}\fi
  \ifx\relax#2\relax\else\kern5.5bp[#2]\fi}
\newcommand{\dotline}[5]{\sw@place{#1}{#2}{#5}%
  \ifsw@grid\global\sw@gridfalse
    \rlap{\kern\dimexpr\sw@gfirst bp-#2bp\relax
      \hbox to\dimexpr\sw@glast bp-\sw@gfirst bp+\sw@gpitch bp+0.5bp\relax
        {\leaders\hbox to\sw@gpitch bp{.\hss}\hfill}}%
    #3\hfill\sw@post#4[]\sw@nil
  \else
    \ifx\relax#3\relax\else#3\kern3.4bp\fi\swdots
    \ifx\relax#4\relax\else\kern3.4bp#4\fi
  \fi}
\newcommand{\swmark}[1]{\unskip\nobreak\hfill\mbox{#1}}
\newcommand{\qmark}[2]{\sw@place{#1}{49.6}{545.7}\hfill\mbox{#2}}
\newcommand{\total}[1]{\sw@place{#1}{49.6}{545.7}\hfill\mbox{[T\kern-1.0bp otal:\ \swmarks]}}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\freerow}[2]{\sw@place{#1}{49.6}{545.7}#2}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-49.6bp\relax\raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-49.6bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\swpath}[3]{\rlap{\begin{tikzpicture}[overlay,x=1bp,y=1bp,baseline=0pt]
  \begin{scope}#3\path[#1] #2;\end{scope}\end{tikzpicture}}}
\newcommand{\swglyph}[2]{\swclip{#1}{#2}}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\srcpdf}{4037_s16_qp_12.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.6bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\makeatother`;

/** 5054_s17_qp_41.tex */
export const PHYSICS = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}
\frenchspacing
\spaceskip=3.058bp plus 2.85bp minus 1.72bp
\xspaceskip=3.058bp plus 2.85bp minus 1.72bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{11bp}{13bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{{\usefont{U}{psy}{m}{n}\char"B0\relax}}
\newcommand{\degC}{\dg C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{3.86bp}[0pt][0pt]{\fontsize{8.25bp}{8.25bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-3.84bp}[0pt][0pt]{\fontsize{8.25bp}{8.25bp}\selectfont #1}}
\newcommand{\stack}[3][5.34/2.66/8]{\sw@stack#1\relax{#2}{#3}}
\def\sw@stack#1/#2/#3\relax#4#5{\begingroup\fontsize{#3bp}{#3bp}\selectfont
  \setbox0=\hbox{#4}\setbox2=\hbox{#5}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{#1bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0\hss}}}%
  \raisebox{-#2bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2\hss}}\endgroup}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.53bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\sw@place{#1}{\sw@curx}{545.7}}
\newcommand{\row}[3]{\sw@place{#1}{#2}{545.7}#3}
\newcommand{\lab}[2]{\llap{\makebox[#1bp][l]{\strut #2}}\ignorespaces}
\def\swdots{\leavevmode\cleaders\hb@xt@ 3.058bp{\hss.\hss}\hfill\kern\z@}
\newcommand{\dotgrid}[3]{\par\gdef\sw@gfirst{#1}\gdef\sw@glast{#2}\gdef\sw@gpitch{#3}%
  \global\sw@gridtrue}
\def\sw@post#1[#2]#3\sw@nil{%
  \ifx\relax#1\relax\else{\ignorespaces#1\unskip}\fi
  \ifx\relax#2\relax\else\kern5.5bp[#2]\fi}
\newcommand{\dotline}[5]{\sw@place{#1}{#2}{#5}%
  \ifsw@grid\global\sw@gridfalse
    \rlap{\kern\dimexpr\sw@gfirst bp-#2bp\relax
      \hbox to\dimexpr\sw@glast bp-\sw@gfirst bp+\sw@gpitch bp+0.5bp\relax
        {\leaders\hbox to\sw@gpitch bp{.\hss}\hfill}}%
    #3\hfill\sw@post#4[]\sw@nil
  \else
    \ifx\relax#3\relax\else#3\kern3.4bp\fi\swdots
    \ifx\relax#4\relax\else\kern3.4bp#4\fi
  \fi}
\newcommand{\swmark}[1]{\unskip\nobreak\hfill\mbox{#1}}
\newcommand{\qmark}[2]{\sw@place{#1}{49.6}{545.7}\hfill\mbox{#2}}
\newcommand{\total}[1]{\sw@place{#1}{49.6}{545.7}\hfill\mbox{[T\kern-1.22bp otal:\ \swmarks]}}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\freerow}[2]{\sw@place{#1}{49.6}{545.7}#2}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-49.6bp\relax\raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-49.6bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\swpath}[3]{\rlap{\begin{tikzpicture}[overlay,x=1bp,y=1bp,baseline=0pt]
  \begin{scope}#3\path[#1] #2;\end{scope}\end{tikzpicture}}}
\newcommand{\swglyph}[2]{\swclip{#1}{#2}}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\srcpdf}{5054_s17_qp_41.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.6bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\makeatother`;

/** 5070_s17_qp_21.tex */
export const CHEMISTRY = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}
\frenchspacing
\spaceskip=3.058bp plus 2.85bp minus 1.72bp
\xspaceskip=3.058bp plus 2.85bp minus 1.72bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{11bp}{13bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{\textdegree}
\newcommand{\degC}{\textdegree C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{3.86bp}[0pt][0pt]{\fontsize{8.25bp}{8.25bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-3.84bp}[0pt][0pt]{\fontsize{8.25bp}{8.25bp}\selectfont #1}}
\newcommand{\scriptat}[3]{\raisebox{#1bp}[0pt][0pt]{\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\stack}[3][5.34/2.66/8]{\sw@stack#1\relax{#2}{#3}}
\def\sw@stack#1/#2/#3\relax#4#5{\begingroup\fontsize{#3bp}{#3bp}\selectfont
  \setbox0=\hbox{#4}\setbox2=\hbox{#5}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{#1bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0\hss}}}%
  \raisebox{-#2bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2\hss}}\endgroup}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.53bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\sw@place{#1}{\sw@curx}{545.7}}
\newcommand{\row}[3]{\sw@place{#1}{#2}{545.7}#3}
\newcommand{\lab}[2]{\llap{\makebox[#1bp][l]{\strut #2}}\ignorespaces}
\def\swdots{\leavevmode\cleaders\hb@xt@ 3.058bp{\hss.\hss}\hfill\kern\z@}
\newcommand{\dotgrid}[3]{\par\gdef\sw@gfirst{#1}\gdef\sw@glast{#2}\gdef\sw@gpitch{#3}%
  \global\sw@gridtrue}
\def\sw@post#1[#2]#3\sw@nil{%
  \ifx\relax#1\relax\else{\ignorespaces#1\unskip}\fi
  \ifx\relax#2\relax\else\kern5.5bp[#2]\fi}
\newcommand{\dotline}[5]{\sw@place{#1}{#2}{#5}%
  \ifsw@grid\global\sw@gridfalse
    \rlap{\kern\dimexpr\sw@gfirst bp-#2bp\relax
      \hbox to\dimexpr\sw@glast bp-\sw@gfirst bp+\sw@gpitch bp+0.5bp\relax
        {\leaders\hbox to\sw@gpitch bp{.\hss}\hfill}}%
    #3\hfill\sw@post#4[]\sw@nil
  \else
    \ifx\relax#3\relax\else#3\kern3.4bp\fi\swdots
    \ifx\relax#4\relax\else\kern3.4bp#4\fi
  \fi}
\newcommand{\swmark}[1]{\unskip\nobreak\hfill\mbox{#1}}
\newcommand{\qmark}[2]{\sw@place{#1}{49.6}{545.7}\hfill\mbox{#2}}
\newcommand{\swtotalas}[1]{\gdef\sw@totalas{#1}\ignorespaces}
\newcommand{\total}[1]{\sw@place{#1}{49.6}{545.7}\hfill
  \ifx\sw@totalas\@empty\mbox{[T\kern-1.22bp otal:\ \swmarks]}\else\mbox{\sw@totalas}\gdef\sw@totalas{}\fi}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\freerow}[2]{\sw@place{#1}{49.6}{545.7}#2}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-49.6bp\relax\raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-49.6bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\swpath}[3]{\rlap{\begin{tikzpicture}[overlay,x=1bp,y=1bp,baseline=0pt]
  \begin{scope}#3\path[#1] #2;\end{scope}\end{tikzpicture}}}
\newcommand{\swglyph}[2]{\swclip{#1}{#2}}
\newcommand{\swcut}[4]{\makebox[#1bp][l]{\raisebox{-#2bp}[0pt][0pt]{\swglyph{#3}{#4}}}}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\srcpdf}{5070_s17_qp_21.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.6bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\makeatother`;

/** 5054_s18_qp_11.tex */
export const PHYSICS_MCQ = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}
\frenchspacing
\spaceskip=3.05bp plus 6.3bp minus 0.06bp
\xspaceskip=3.05bp plus 6.3bp minus 0.06bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{10.98bp}{12.65bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{{\usefont{U}{psy}{m}{n}\char"B0\relax}}
\newcommand{\degC}{\dg C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{4.98bp}[0pt][0pt]{\fontsize{7.02bp}{7.02bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-1.5bp}[0pt][0pt]{\fontsize{7.02bp}{7.02bp}\selectfont #1}}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\vI}{\makebox[4.6bp][l]{\fontfamily{ptm}\fontsize{12.06bp}{12bp}\selectfont\itshape I}}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\swbul}{\makebox[6.66bp][l]{\raisebox{-3.36bp}[0pt][0pt]{\kern0.07bp
  \fontsize{19.02bp}{19bp}\selectfont\textbullet}}}
\newcommand{\nuc}[2]{{\fontsize{7.02bp}{7.02bp}\selectfont
  \setbox0=\hbox{#1}\setbox2=\hbox{#2}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{5.4bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0}}}%
  \raisebox{-3bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2}}}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.59bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\total}{\par\ifswwb\else\ifswweb\else\fi\fi}
\newlength{\swhang}
\setlength{\swhang}{21.3bp}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\par\swnb
  \ifsw@pending \sw@puthead{#1}{16}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth-\ht\strutbox\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{\dimexpr #1bp-\ht\strutbox\relax}
  \else \vskip\dimexpr #1bp-\prevdepth-\ht\strutbox\relax\fi\fi
  \ifdim\sw@hang bp>0pt \hangindent=\sw@hang bp\relax\hangafter=1\relax\fi
  \gdef\sw@hang{0}%
  \rightskip=3bp\relax
  \nointerlineskip\noindent\strut\ignorespaces}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\stem}[2]{\swat{#1}#2}
\newcommand{\mcq}[3]{\swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3}
\newlength{\optcolw}
\setlength{\optcolw}{99.25bp}
\newcommand{\optrow}[5]{\swat{#1}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\strut\textbf{A}}#2}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{B}}#3}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{C}}#4}%
  \makebox[\swhang][l]{\textbf{D}}#5\par}
\newcommand{\choice}[3]{\par\begingroup
  \leftskip=\dimexpr\swhang+\swhang\relax
  \@totalleftmargin=\dimexpr\swhang+\swhang\relax
  \linewidth=\dimexpr\textwidth-\swhang-\swhang\relax
  \swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3\par\endgroup}
\newcommand{\prow}[3]{\par\begingroup
  \leftskip=\dimexpr #2bp-49.6bp\relax \@totalleftmargin=\leftskip
  \linewidth=\dimexpr\textwidth-\leftskip\relax
  \swat{#1}#3\par\endgroup}
\newcommand{\plab}[2]{\llap{\makebox[#1bp][l]{#2}}\ignorespaces}
\newcommand{\freerow}[2]{\swat{#1}#2}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-70.9bp\relax
  \raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-70.9bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\srcpdf}{5054_s18_qp_11.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}\rightskip=\z@%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.6bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\newlength{\swhang}\setlength{\swhang}{21.3bp}
\newlength{\optcolw}\setlength{\optcolw}{99.25bp}
\makeatother`;

/** 5070_s16_qp_11.tex */
export const CHEMISTRY_MCQ = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}
\frenchspacing
\spaceskip=3.05bp plus 6.3bp minus 0.06bp
\xspaceskip=3.05bp plus 6.3bp minus 0.06bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{10.98bp}{12.65bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{\textdegree}
\newcommand{\degC}{\textdegree C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{4.98bp}[0pt][0pt]{\fontsize{7.02bp}{7.02bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-1.5bp}[0pt][0pt]{\fontsize{7.02bp}{7.02bp}\selectfont #1}}
\newcommand{\scriptat}[3]{\raisebox{#1bp}[0pt][0pt]{\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\vI}{\makebox[4.6bp][l]{\fontfamily{ptm}\fontsize{12.06bp}{12bp}\selectfont\itshape I}}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\swbul}{\makebox[6.66bp][l]{\raisebox{-3.36bp}[0pt][0pt]{\kern0.07bp
  \fontsize{19.02bp}{19bp}\selectfont\textbullet}}}
\newcommand{\nuc}[2]{{\fontsize{7.02bp}{7.02bp}\selectfont
  \setbox0=\hbox{#1}\setbox2=\hbox{#2}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{5.4bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0}}}%
  \raisebox{-3bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2}}}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.59bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\total}{\par\ifswwb\else\ifswweb\else\fi\fi}
\newlength{\swhang}
\setlength{\swhang}{21.3bp}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\par\swnb
  \ifsw@pending \sw@puthead{#1}{16}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth-\ht\strutbox\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{\dimexpr #1bp-\ht\strutbox\relax}
  \else \vskip\dimexpr #1bp-\prevdepth-\ht\strutbox\relax\fi\fi
  \ifdim\sw@hang bp>0pt \hangindent=\sw@hang bp\relax\hangafter=1\relax\fi
  \gdef\sw@hang{0}%
  \rightskip=3bp\relax
  \nointerlineskip\noindent\strut\ignorespaces}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\stem}[2]{\swat{#1}#2}
\newcommand{\mcq}[3]{\swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3}
\newlength{\optcolw}
\setlength{\optcolw}{99.25bp}
\newcommand{\optrow}[5]{\swat{#1}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\strut\textbf{A}}#2}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{B}}#3}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{C}}#4}%
  \makebox[\swhang][l]{\textbf{D}}#5\par}
\newcommand{\choice}[3]{\par\begingroup
  \leftskip=\dimexpr\swhang+\swhang\relax
  \@totalleftmargin=\dimexpr\swhang+\swhang\relax
  \linewidth=\dimexpr\textwidth-\swhang-\swhang\relax
  \swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3\par\endgroup}
\newcommand{\prow}[3]{\par\begingroup
  \leftskip=\dimexpr #2bp-49.6bp\relax \@totalleftmargin=\leftskip
  \linewidth=\dimexpr\textwidth-\leftskip\relax
  \swat{#1}#3\par\endgroup}
\newcommand{\plab}[2]{\llap{\makebox[#1bp][l]{#2}}\ignorespaces}
\newcommand{\freerow}[2]{\swat{#1}#2}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-70.9bp\relax
  \raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-70.9bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\srcpdf}{5070_s16_qp_11.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\swglyph}[2]{\swclip{#1}{#2}}
\newcommand{\swcut}[4]{\makebox[#1bp][l]{\raisebox{-#2bp}[0pt][0pt]{\swglyph{#3}{#4}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}\rightskip=\z@%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.6bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\newlength{\swhang}\setlength{\swhang}{21.3bp}
\newlength{\optcolw}\setlength{\optcolw}{99.25bp}
\makeatother`;

/** 5070_s26_qp_11.tex */
export const CHEMISTRY_MCQ_26 = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}
\frenchspacing
\spaceskip=3.07bp plus 6.3bp minus 0.4bp
\xspaceskip=3.07bp plus 6.3bp minus 0.4bp
\makeatletter
\renewcommand\normalsize{\@setfontsize\normalsize{11.04bp}{12.72bp}%
  \abovedisplayskip\z@ \belowdisplayskip\z@
  \abovedisplayshortskip\z@ \belowdisplayshortskip\z@}
\makeatother
\makeatletter
\newcommand{\ftsize}{\fontsize{8bp}{9bp}\selectfont}
\newcommand{\ohms}{{\usefont{U}{psy}{m}{n}W}}
\newcommand{\dg}{\textdegree}
\newcommand{\degC}{\textdegree C}
\newcommand{\x}{\ensuremath{\times}}
\newcommand{\pow}[1]{\raisebox{5.04bp}[0pt][0pt]{\fontsize{6.96bp}{6.96bp}\selectfont #1}}
\newcommand{\sub}[1]{\raisebox{-1.55bp}[0pt][0pt]{\fontsize{6.96bp}{6.96bp}\selectfont #1}}
\newcommand{\scriptat}[3]{\raisebox{#1bp}[0pt][0pt]{\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\swsy}[1]{{\usefont{U}{psy}{m}{n}\char"#1\relax}}
\newcommand{\vI}{\makebox[4.6bp][l]{\fontfamily{ptm}\fontsize{12.06bp}{12bp}\selectfont\itshape I}}
\newcommand{\swf}[3]{{\fontfamily{#1}\fontsize{#2bp}{#2bp}\selectfont #3}}
\newcommand{\swbul}{\makebox[6.66bp][l]{\raisebox{-3.36bp}[0pt][0pt]{\kern0.07bp
  \fontsize{19.02bp}{19bp}\selectfont\textbullet}}}
\newcommand{\nuc}[2]{{\fontsize{6.96bp}{6.96bp}\selectfont
  \setbox0=\hbox{#1}\setbox2=\hbox{#2}%
  \dimen0=\ifdim\wd0>\wd2 \wd0\else\wd2\fi
  \rlap{\raisebox{5.4bp}[0pt][0pt]{\hbox to\dimen0{\hss\box0}}}%
  \raisebox{-3bp}[0pt][0pt]{\hbox to\dimen0{\hss\box2}}}}
\AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.56bp\relax\fi}}
\newcommand{\partbreak}{\par\ifswwb\penalty\z@\else\ifswweb\penalty\z@\fi\fi}
\newcommand{\swpage}{\par\newpage\pagestart}
\newcommand{\examq}[4]{\par %
  \gdef\swpaper{#1}\gdef\swqnum{#2}\gdef\swtopics{#3}\gdef\swmarks{#4}%
  \ifswwb\sw@qhead{\sw@wbhead{#1}{#2}{#3}}\else
  \ifswweb\sw@qhead{\sw@webhead{#1}{#2}{#3}{#4}}\fi\fi}
\newcommand{\total}{\par\ifswwb\else\ifswweb\else\fi\fi}
\newlength{\swhang}
\setlength{\swhang}{21.24bp}
\newcommand{\pagestart}{\par\prevdepth=-1000pt\relax\marks5{}}
\newcommand{\swat}[1]{\par\swnb
  \ifsw@pending \sw@puthead{#1}{16}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth-\ht\strutbox\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{\dimexpr #1bp-\ht\strutbox\relax}
  \else \vskip\dimexpr #1bp-\prevdepth-\ht\strutbox\relax\fi\fi
  \ifdim\sw@hang bp>0pt \hangindent=\sw@hang bp\relax\hangafter=1\relax\fi
  \gdef\sw@hang{0}%
  \rightskip=3bp\relax
  \nointerlineskip\noindent\strut\ignorespaces}
\newcommand{\gap}[1]{\par\vspace{#1bp}}
\newcommand{\hang}[1]{\par\gdef\sw@hang{#1}}
\newcommand{\stem}[2]{\swat{#1}#2}
\newcommand{\mcq}[3]{\swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3}
\newlength{\optcolw}
\setlength{\optcolw}{99.24bp}
\newcommand{\optrow}[5]{\swat{#1}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\strut\textbf{A}}#2}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{B}}#3}%
  \makebox[\optcolw][l]{\makebox[\swhang][l]{\textbf{C}}#4}%
  \makebox[\swhang][l]{\textbf{D}}#5\par}
\newcommand{\choice}[3]{\par\begingroup
  \leftskip=\dimexpr\swhang+\swhang\relax
  \@totalleftmargin=\dimexpr\swhang+\swhang\relax
  \linewidth=\dimexpr\textwidth-\swhang-\swhang\relax
  \swat{#1}%
  \llap{\makebox[\swhang][l]{\strut\textbf{#2}}}#3\par\endgroup}
\newcommand{\prow}[3]{\par\begingroup
  \leftskip=\dimexpr #2bp-49.56bp\relax \@totalleftmargin=\leftskip
  \linewidth=\dimexpr\textwidth-\leftskip\relax
  \swat{#1}#3\par\endgroup}
\newcommand{\plab}[2]{\llap{\makebox[#1bp][l]{#2}}\ignorespaces}
\newcommand{\freerow}[2]{\swat{#1}#2}
\newcommand{\swdepth}[1]{\vrule width\z@ height\z@ depth#1bp\relax}
\newcommand{\at}[3]{\rlap{\kern\dimexpr #1bp-70.8bp\relax
  \raisebox{#2bp}[0pt][0pt]{#3}}}
\newcommand{\ruleat}[4]{\rlap{\kern\dimexpr #1bp-70.8bp\relax
  \raisebox{\dimexpr #3bp-#4bp/2\relax}[0pt][0pt]{\rule{\dimexpr #2bp-#1bp\relax}{#4bp}}}}
\newcommand{\srcpdf}{5070_s26_qp_11.pdf}
\newcommand{\swclip}[3][]{%
  \IfFileExists{\srcpdf}{\includegraphics[page=#2,trim=#3,clip,#1]{\srcpdf}}%
  {\fbox{\parbox[c][22mm][c]{0.45\textwidth}{\centering\ttfamily\footnotesize
    source PDF missing:\\\detokenize\expandafter{\srcpdf}}}}}
\newcommand{\swglyph}[2]{\swclip{#1}{#2}}
\newcommand{\swcut}[4]{\makebox[#1bp][l]{\raisebox{-#2bp}[0pt][0pt]{\swglyph{#3}{#4}}}}
\newcommand{\qfig}[7][]{\par\swnb\begingroup\setlength{\parskip}{0pt}\rightskip=\z@%
  \ifsw@pending \sw@puthead{#5}{12}\nobreak
    \vskip\dimexpr\sw@rest-\prevdepth\relax
  \else
  \ifdim\prevdepth<-999pt \vspace*{#5bp}
  \else \vskip\dimexpr #5bp-\prevdepth\relax\fi\fi
  \nointerlineskip
  \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
    \hspace*{\dimexpr #7bp-49.56bp\relax}\swclip[#1]{#2}{#3}\hfil}\par
  \ifx\relax#4\relax\else
    \vskip #6bp\relax\nointerlineskip
    \noindent\makebox[\linewidth][l]{\hspace*{-\@totalleftmargin}%
      \makebox[\textwidth][c]{\textbf{#4}}}\par
  \fi\endgroup}
\newlength{\swhang}\setlength{\swhang}{21.24bp}
\newlength{\optcolw}\setlength{\optcolw}{99.24bp}
\makeatother`;
