import React from "react";
import * as motion from "motion/react-client"

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
    size = "normal"
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

        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={card && {

                duration: 0.4,
                scale: { type: "spring", visualDuration: 0.4, bounce: 0.5 },
            }}
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
            className={` --font-lexend-sans flex justify-center items-center  font-bold rounded-sm 
                select-none  bg-[#eddbaf]  ${baseCls} ${isEmpty ? "opacity-40" : "cursor-grab"
                } ${selectionCls} ${dragOverCls} ${size == "normal" ? "w-7 h-10 text-lg" : size == "small" && "w-5 h-8 text-base"}  `}
        >
            {display}
        </motion.div>
    );
}
