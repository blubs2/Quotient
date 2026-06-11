"use client";
import { useState } from "react";
import Link from "next/link";
import { VOCAB } from "@/lib/data/vocab";
import { boxOf } from "@/lib/srs";
import { useApp } from "@/components/AppProvider";

export default function VaultPage() {
  const { srs } = useApp();
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Word Vault · {VOCAB.length} words</div>
      </div>
      <div className="qz-vault">
        {VOCAB.map((v) => {
          const box = boxOf(srs[v.w]);
          const isOpen = open === v.w;
          return (
            <div key={v.w} className="qz-vword" onClick={() => setOpen(isOpen ? null : v.w)}>
              <div className="qz-vrow">
                <span className="qz-vw">{v.w}</span>
                <span className="qz-vbox" title={`memory strength ${box} of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={"qz-pip" + (i < box ? " qz-pip-on" : "")} />
                  ))}
                </span>
              </div>
              {isOpen && (
                <div className="qz-vdetail">
                  <p><strong>{v.pos}</strong> {v.def}</p>
                  <p className="qz-vex">&quot;{v.ex}&quot;</p>
                  <p className="qz-vnote">{v.note}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
