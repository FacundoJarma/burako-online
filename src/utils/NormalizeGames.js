const COLOR_ORDER = ["red", "yellow", "blue", "black"];

function isExplicitJoker(t) {
    return t && t.color === "joker";
}

function cloneTile(t) {
    return t ? { color: t.color, number: t.number } : null;
}

function sortByNumberThenColor(a, b) {
    if ((a.number || 0) !== (b.number || 0)) return (a.number || 0) - (b.number || 0);
    return COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color);
}

function buildRun(nonJokers, jokersPool) {
    // nonJokers same color, sort ascending numbers and fill gaps with jokers sequentially
    const nums = nonJokers.map(t => t.number).slice().sort((a, b) => a - b);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const map = new Map();
    nonJokers.forEach(t => {
        const arr = map.get(t.number) || [];
        arr.push(t);
        map.set(t.number, arr);
    });

    const result = [];
    let jokerIdx = 0;
    for (let n = min; n <= max; n++) {
        if (map.has(n)) {
            map.get(n).forEach(tile => result.push(cloneTile(tile)));
        } else {
            // usar joker si hay
            if (jokerIdx < jokersPool.length) {
                result.push(cloneTile(jokersPool[jokerIdx++]));
            } else {
                result.push({ color: "joker", number: null });
            }
        }
    }
    // anexar jokers sobrantes
    for (; jokerIdx < jokersPool.length; jokerIdx++) result.push(cloneTile(jokersPool[jokerIdx]));
    return result;
}

function buildGroup(nonJokers, jokersPool) {
    // ordenar por COLOR_ORDER e intentar insertar el primer joker en el primer color faltante
    const number = nonJokers[0].number;
    const ordered = nonJokers.slice().sort((a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color));
    if (jokersPool.length > 0) {
        const present = new Set(ordered.map(t => t.color));
        const needed = COLOR_ORDER.find(c => !present.has(c));
        const joker = jokersPool[0];
        if (needed) {
            const insertIdx = ordered.findIndex(t => COLOR_ORDER.indexOf(t.color) > COLOR_ORDER.indexOf(needed));
            if (insertIdx === -1) ordered.push(cloneTile(joker));
            else ordered.splice(insertIdx, 0, cloneTile(joker));
            // anexar restantes al final
            for (let i = 1; i < jokersPool.length; i++) ordered.push(cloneTile(jokersPool[i]));
            return ordered;
        } else {
            return ordered.concat(jokersPool.map(cloneTile));
        }
    }
    return ordered;
}

function orderSingleMeldSimple(meld) {
    if (!Array.isArray(meld) || meld.length === 0) return [];

    // copias de referencia (no mutamos)
    const tiles = meld.slice();

    const explicitJokers = tiles.filter(isExplicitJoker);
    // encontrar primera 2 (no joker) para usar opcionalmente como pseudo-joker si no hay explicit jokers
    const twos = tiles.filter(t => !isExplicitJoker(t) && t.number === 2);
    let pseudoJoker = null;
    if (explicitJokers.length === 0 && twos.length > 0) {
        pseudoJoker = twos[0]; // usamos la primera 2 como comodín (simple)
    }

    // construir nonJokers: quitar explicit jokers y la pseudoJoker si existe
    const nonJokers = tiles.filter(t => !isExplicitJoker(t) && t !== pseudoJoker);
    const jokersPool = explicitJokers.slice();
    if (pseudoJoker) jokersPool.push(pseudoJoker);

    // caso escalera: todos nonJokers same color (y al menos 1)
    if (nonJokers.length > 0) {
        const colors = new Set(nonJokers.map(t => t.color));
        if (colors.size === 1) {
            return buildRun(nonJokers, jokersPool);
        }
    }

    // caso grupo: todos nonJokers same number
    if (nonJokers.length > 0) {
        const numbers = new Set(nonJokers.map(t => t.number));
        if (numbers.size === 1) {
            return buildGroup(nonJokers, jokersPool);
        }
    }

    // fallback simple: ordenar por número y color, luego anexar jokers al final
    const nonJ = tiles.filter(t => !isExplicitJoker(t) && t !== pseudoJoker).slice().sort(sortByNumberThenColor);
    const explicit = tiles.filter(isExplicitJoker);
    if (pseudoJoker && !explicitJokers.length) {
        // si pseudoJoker fue usado, lo ponemos al final como joker
        return nonJ.concat(cloneTile(pseudoJoker)).concat(explicit.map(cloneTile));
    }
    return nonJ.concat(explicit.map(cloneTile));
}

export function orderMeldsForDisplaySimple(melds) {
    if (!Array.isArray(melds)) return [];
    return melds.map(m => orderSingleMeldSimple(m || []));
}
