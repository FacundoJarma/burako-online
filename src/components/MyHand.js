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

    // ... (Lógica de UIDs y Sincronización de Slots sin cambios) ...

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
     */
    // ... (Línea 80 - Dentro de useEffect)
    /**
     * Lógica de Sincronización de Slots (Persistencia de Posición)
     */
    useEffect(() => {
        setSlots(prevSlots => {
            const newUids = new Set(items.map(i => i._uid));
            const oldUids = new Set(prevSlots.filter(Boolean).map(s => s._uid));

            const newItemMap = new Map(items.map(item => [item._uid, item]));
            const nextSlots = Array(TOTAL_SLOTS).fill(null);
            const availableSlots = [];

            // 1. Persistir cartas existentes y liberar slots de cartas viejas/eliminadas
            prevSlots.forEach((slot, index) => {
                if (slot && newUids.has(slot._uid)) {
                    nextSlots[index] = newItemMap.get(slot._uid);
                    newItemMap.delete(slot._uid);
                } else {
                    availableSlots.push(index);
                }
            });

            // 2. Colocar las cartas nuevas en los slots disponibles
            const newItemsToPlace = Array.from(newItemMap.values());

            newItemsToPlace.forEach((newItem, i) => {
                const targetIndex = availableSlots[i];
                if (targetIndex !== undefined) {
                    nextSlots[targetIndex] = newItem;
                }
            });

            // 3. 🛑 PREVENCIÓN DEL BUCLE INFINITO
            // Comprobamos si la estructura de slots realmente cambió antes de devolver nextSlots.
            const didSlotsChange = nextSlots.some((slot, index) => {
                // Compara el _uid, que es la identidad única de la carta
                return (slot?._uid !== prevSlots[index]?._uid);
            });

            if (!didSlotsChange) {
                // Si no hay cambio en la posición/identidad de las cartas, NO actualizar el estado.
                return prevSlots;
            }

            // 4. Limpiar la selección de cartas que ya no existen en la mano
            if (!Array.from(oldUids).every(uid => newUids.has(uid))) {
                setSelectedSet(prevSet => {
                    const nextSet = new Set(prevSet);
                    let changed = false;
                    prevSet.forEach(uid => {
                        if (!newUids.has(uid)) {
                            nextSet.delete(uid);
                            changed = true;
                        }
                    });
                    if (changed) return nextSet;
                    return prevSet;
                });
            }

            return nextSlots;
        });
    }, [items, TOTAL_SLOTS]); // Dependencias correctas para la lógica actual

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

        <div className="w-[25em] perspective-midrange">
            <div
                className="grid gap-2 transform-gpu origin-bottom rotate-x-[25deg] shadow-xl shadow-slate-900 rounded-xl bg-black/60 p-2"
                style={{
                    gridTemplateColumns: `repeat(${TOTAL_COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${TOTAL_ROWS}, 1fr)`,
                    // Esencial para que los hijos hereden el espacio 3D.
                    transformStyle: 'preserve-3d',
                    // Añadimos un pequeño margen para que la rotación 3D no recorte el borde inferior/derecho
                    marginBottom: '60px',
                    marginLeft: '10px'
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