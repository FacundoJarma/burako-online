import React from "react";

/**
 * Tile
 * Props:
 * - index: number
 * - card: object | null
 * - isSelected: boolean
 * - isDragOver: boolean
 * - draggable: boolean
 * - onDragStart(e): handler
 * - onDragEnd(e): handler
 * - onDragOver(e): handler
 * - onDrop(e): handler
 * - onClick(): handler
 */
export default function Tile({
    index,
    card,
    isSelected,
    isDragOver,
    draggable,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onClick,
}) {
    const colorClasses = {
        red: "text-red-700",
        yellow: "text-yellow-700",
        blue: "text-blue-700",
        black: "text-slate-900",
        joker: "text-white",
    };

    const isEmpty = !card;
    const baseCls = card
        ? colorClasses[card?.color] ?? "bg-slate-900/50 border-slate-800 text-white"
        : "border bg-transparent border-dashed border-slate-200";

    const display = card?.number ?? (card ? "🃏" : "");
    const title = card
        ? card?.color
            ? `${card.color.toUpperCase()} ${card.number ?? "JOKER"}`
            : `${card.number ?? "JOKER"}`
        : "Vacío";

    const selectionCls = isSelected ? "ring-2 ring-green-400" : "";
    const dragOverCls = isDragOver ? "ring-2 ring-sky-400" : "";

    return (
        <div
            key={card ? card._uid : `empty-${index}`}
            data-hand-slot={index}
            draggable={!isEmpty && draggable}
            onDragStart={(e) => !isEmpty && onDragStart && onDragStart(e, index)}
            onDragEnd={(e) => !isEmpty && onDragEnd && onDragEnd(e)}
            onDragOver={(e) => onDragOver && onDragOver(e, index)}
            onDrop={(e) => onDrop && onDrop(e, index)}
            onClick={() => onClick && onClick(index)}
            title={title}
            aria-label={title}
            className={`w-7 --font-lexend-sans flex justify-center items-center  h-10 text-lg font-bold rounded-sm select-none  bg-[#eddbaf] ${baseCls} ${isEmpty ? "opacity-40" : "cursor-grab"
                } ${selectionCls} ${dragOverCls}`}
        >
            {display}
        </div>
    );
}
