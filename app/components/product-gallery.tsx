"use client";

import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "../../lib/products";
import { ProductVisual, productImageNote } from "./product-visual";

/**
 * Product image with an accessible zoom dialog. Only real files are shown:
 * no extra "gallery" frames are invented when a product has one image.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const note = productImageNote(product);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="product-page-image">
      <div className="product-visual-frame">
        <ProductVisual product={product} priority sizes="(max-width: 900px) 100vw, 50vw" />
        {product.image && (
          <button ref={triggerRef} type="button" className="zoom-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
            <Maximize2 size={16} aria-hidden="true" /> Görseli büyüt
          </button>
        )}
      </div>
      {note && <p className="product-image-note">{note}</p>}
      {product.image && (
        <dialog
          ref={dialogRef}
          className="zoom-dialog"
          aria-label={`${product.name} görseli`}
          onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <button type="button" className="zoom-close" onClick={() => setOpen(false)} aria-label="Büyütülmüş görseli kapat"><X size={20} aria-hidden="true" /></button>
          {open && <Image src={product.image.src} alt={product.image.alt} width={1600} height={1600} sizes="(max-width: 1100px) 96vw, 1100px" className="zoom-image" />}
          {note && <p>{note}</p>}
        </dialog>
      )}
    </div>
  );
}
