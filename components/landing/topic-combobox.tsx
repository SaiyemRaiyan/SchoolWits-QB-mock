"use client";

import { useEffect, useRef, useState } from "react";

type TopicComboboxProps = {
  topics: string[];
  placeholder: string;
  disabled: boolean;
  /** The committed topic, or "" for "any topic". */
  onChange: (topic: string) => void;
};

/**
 * A text input with a filtered dropdown, not a <select>: the topic lists
 * run to a few hundred entries per subject, so typing has to narrow them.
 *
 * Free typing that matches nothing counts as "no topic chosen" -- only an
 * exact pick from the list narrows the search. That is why the committed
 * value is derived from the list rather than being whatever was typed.
 *
 * The parent remounts this with a `key` when the subject changes, which
 * is what clears the box; there is deliberately no effect syncing the
 * input text back down from a prop, because that fights the typing.
 */
export function TopicCombobox({ topics, placeholder, disabled, onChange }: TopicComboboxProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const query = text.trim().toLowerCase();
  const matches = query ? topics.filter((t) => t.toLowerCase().includes(query)) : topics;
  const chosen = topics.includes(text) ? text : "";

  function commit(next: string) {
    setText(next);
    onChange(topics.includes(next) ? next : "");
  }

  // Clicking anywhere outside closes the menu. Bound only while it is
  // open so the page is not listening to every click for nothing.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="lp-combo" ref={root}>
      <input
        ref={input}
        type="text"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          commit(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter takes the first match when something has been typed,
            // and "Any topic" otherwise. The form must not submit from here.
            e.preventDefault();
            commit(text.trim() && matches.length ? matches[0] : "");
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      <div className="lp-combo-menu" hidden={!open}>
        <div
          className={`lp-combo-option${chosen ? "" : " active"}`}
          onMouseDown={() => {
            commit("");
            setOpen(false);
          }}
        >
          Any topic
        </div>
        {matches.map((t) => (
          <div
            key={t}
            className={`lp-combo-option${t === chosen ? " active" : ""}`}
            // mousedown, not click: the input's blur would otherwise close
            // the menu before the click landed.
            onMouseDown={() => {
              commit(t);
              setOpen(false);
            }}
          >
            {t}
          </div>
        ))}
        {matches.length === 0 && <div className="lp-combo-empty">No matching topics</div>}
      </div>
    </div>
  );
}
