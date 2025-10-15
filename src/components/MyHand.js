import React, { useEffect, useMemo, useRef, useState } from "react";
import Tile from "./Tile";

/**
 * MyHand (draggable, slots 11x3) — comportamiento: swap / move (no shift) + selección por click
 * props:
 * - hand: Array of cards. Cada card: { id?:string, color: "red"|"blue"|"yellow"|"black"|"joker", number: 1..13|null }
 * - onChange: (newHandArray) => void  // se llama cuando la mano se reordena (orden según casillas, sin nulls)
 * - onSelectionChange?: (selectedCards) => void // opcional, recibe array de cartas seleccionadas (sin metadatos internos)
 */
export default function MyHand({ hand = [], onChange = () => { }, onSelectionChange }) {
    const TOTAL_COLS = 11;
    const TOTAL_ROWS = 3;
    const TOTAL_SLOTS = TOTAL_COLS * TOTAL_ROWS; // 33

    // UIDs estables por carta (si ya tiene id usamos id, si no generamos)
    const uidMapRef = useRef(new Map());
    useEffect(() => {
        const counters = {};
        hand.forEach((card) => {
            const key = card.id ?? `${card.color ?? "c"}-${card.number ?? "n"}`;
            counters[key] = (counters[key] || 0) + 1;
            const keyWithCount = `${key}#${counters[key]}`;
            if (!uidMapRef.current.has(keyWithCount)) {
                uidMapRef.current.set(
                    keyWithCount,
                    card.id ??
                    `uid_${Date.now().toString(36)}_${Math.random()
                        .toString(36)
                        .slice(2, 8)}`
                );
            }
        });

        // limpiar UIDs que ya no aplican
        const keep = new Set();
        Object.keys(counters).forEach((k) => {
            for (let i = 1; i <= counters[k]; i++) keep.add(`${k}#${i}`);
        });
        for (let k of Array.from(uidMapRef.current.keys())) {
            if (
                !keep.has(k) &&
                !(
                    k.startsWith("id:") &&
                    hand.find((h) => h.id && `id:${h.id}` === k)
                )
            ) {
                uidMapRef.current.delete(k);
            }
        }
    }, [hand]);

    // Construir items con _uid
    const items = useMemo(() => {
        const counters = {};
        return hand.map((card) => {
            const key = card.id ?? `${card.color ?? "c"}-${card.number ?? "n"}`;
            counters[key] = (counters[key] || 0) + 1;
            const k = `${key}#${counters[key]}`;
            const _uid = uidMapRef.current.get(k) ?? (card.id ?? k);
            return { ...card, _uid, _origKey: k };
        });
    }, [hand]);

    // Crear slots iniciales
    const [slots, setSlots] = useState(() => {
        const s = Array(TOTAL_SLOTS).fill(null);
        for (let i = 0; i < Math.min(items.length, TOTAL_SLOTS); i++) s[i] = items[i];
        return s;
    });

    // selección: set de _uid
    const [selectedSet, setSelectedSet] = useState(() => new Set());

    /**
     * Lógica de Sincronización de Slots (Persistencia de Posición)
     * Cuando 'items' (hand con _uid) cambia:
     */
    useEffect(() => {
        setSlots(prevSlots => {
            const newUids = new Set(items.map(i => i._uid));
            const oldUids = new Set(prevSlots.filter(Boolean).map(s => s._uid));

            // 1. Crear un mapa de las nuevas fichas por UID
            const newItemMap = new Map(items.map(item => [item._uid, item]));

            // 2. Mapear las fichas existentes a sus posiciones anteriores
            const nextSlots = Array(TOTAL_SLOTS).fill(null);
            const availableSlots = [];

            // Fichas persistentes y lista de huecos
            prevSlots.forEach((slot, index) => {
                if (slot && newUids.has(slot._uid)) {
                    // Mantener ficha existente en su posición
                    nextSlots[index] = newItemMap.get(slot._uid);
                    // Eliminar del mapa de nuevas, ya fue colocada
                    newItemMap.delete(slot._uid);
                } else {
                    // Si el slot estaba vacío o la ficha fue quitada, es un hueco
                    availableSlots.push(index);
                }
            });

            // 3. Colocar fichas nuevas en los primeros huecos disponibles
            const newItemsToPlace = Array.from(newItemMap.values());

            newItemsToPlace.forEach((newItem, i) => {
                const targetIndex = availableSlots[i];
                if (targetIndex !== undefined) {
                    nextSlots[targetIndex] = newItem;
                }
            });

            // 4. Limpiar selección si alguna carta desaparece
            // CORRECCIÓN: Usar Array.from() para invocar .every() en el Set 'oldUids'.
            if (!Array.from(oldUids).every(uid => newUids.has(uid))) {
                setSelectedSet(prevSet => {
                    const nextSet = new Set(prevSet);
                    prevSet.forEach(uid => {
                        if (!newUids.has(uid)) {
                            nextSet.delete(uid);
                        }
                    });
                    return nextSet;
                });
            }

            return nextSlots;
        });
    }, [items, TOTAL_SLOTS]); // items es el array de cartas entrantes con _uid

    // notificar cambios de selección al padre (después del render)
    useEffect(() => {
        if (!onSelectionChange) return;

        const selectedCards = slots
            .filter((s) => s && selectedSet.has(s._uid))
            .map(({ _uid, _origKey, id, ...rest }) => (id ? { id, ...rest } : rest));

        onSelectionChange(selectedCards);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSet, slots]);

    const draggingIndexRef = useRef(null);
    const dragOverIndexRef = useRef(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    function handleDragStart(e, index) {
        if (!slots[index]) {
            e.preventDefault();
            return;
        }
        draggingIndexRef.current = index;
        e.dataTransfer.setData("text/plain", slots[index]._uid);
        // añadir clase visual en el elemento draggeado
        try {
            e.currentTarget.classList.add("opacity-60");
        } catch (err) {
            // ignore
        }
    }

    function handleDragEnd(e) {
        try {
            e.currentTarget.classList.remove("opacity-60");
        } catch (err) {
            // ignore
        }
        draggingIndexRef.current = null;
        dragOverIndexRef.current = null;
        setDragOverIndex(null);
    }

    function handleDragOver(e, index) {
        e.preventDefault();
        if (dragOverIndexRef.current !== index) {
            dragOverIndexRef.current = index;
            setDragOverIndex(index);
        }
    }

    function handleDrop(e, index) {
        e.preventDefault();
        const uid = e.dataTransfer.getData("text/plain");
        let from = draggingIndexRef.current;
        if (from === null || from === undefined) {
            from = slots.findIndex((s) => s && s._uid === uid);
        }
        const to = index;
        if (from < 0 || to < 0) {
            handleDragEnd(e);
            return;
        }
        if (from === to) {
            handleDragEnd(e);
            return;
        }

        const updated = [...slots];
        const moved = updated[from];
        const target = updated[to];

        updated[to] = moved;
        updated[from] = target ?? null;

        setSlots(updated);

        // notificar nuevo orden
        const clean = updated
            .filter(Boolean)
            .map(({ _uid, _origKey, id, ...rest }) => (id ? { id, ...rest } : rest));
        onChange(clean);

        handleDragEnd(e);
    }

    // toggle selección por click
    function toggleSelect(index) {
        if (draggingIndexRef.current !== null) return;
        const card = slots[index];
        if (!card) return;
        setSelectedSet((prev) => {
            const next = new Set(prev);
            if (next.has(card._uid)) next.delete(card._uid);
            else next.add(card._uid);
            return next;
        });
    }

    const isMySlotSelected = (card) => (card ? selectedSet.has(card._uid) : false);

    return (
        <div className="p-2 rounded-xl border border-slate-800 w-[25em]">
            <div
                className="grid gap-2"
                style={{
                    gridTemplateColumns: `repeat(${TOTAL_COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${TOTAL_ROWS}, 1fr)`,
                }}
            >
                {slots.map((card, index) => {
                    return (
                        <Tile
                            key={card ? card._uid : `empty-${index}`}
                            index={index}
                            card={card}
                            isSelected={isMySlotSelected(card)}
                            isDragOver={dragOverIndex === index}
                            draggable={!(!card)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={toggleSelect}
                        />
                    );
                })}
            </div>
        </div>
    );
}