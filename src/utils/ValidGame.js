
export function isValidMeld(meld) {
    if (!Array.isArray(meld) || meld.length < 3) return false;

    // Jokers explícitos (color === "joker")
    const explicitJokers = meld.filter(t => t.color === "joker");
    if (explicitJokers.length > 1) return false; // regla: máximo 1 comodín explícito

    // Fichas "2" que pueden actuar como comodín opcionalmente
    const twoTiles = meld.filter(t => t.number === 2 && t.color !== "joker");

    // Helper: prueba si una configuración (nonJokers, jokers) forma un meld válido
    function validateWith(nonJokers, jokers) {
        if (!Array.isArray(nonJokers) || nonJokers.length === 0) return false;
        // valores de las fichas no-comodín
        const numbers = nonJokers.map(t => t.number);
        const colors = nonJokers.map(t => t.color);
        const uniqueColors = new Set(colors.filter(Boolean));
        const uniqueNumbers = new Set(numbers);

        // ===== ESCALERA =====
        // Mismo color (entre no-comodines), números consecutivos; los gaps deben poder cubrirse con jokers.length
        if (uniqueColors.size === 1) {
            const sortedNums = [...numbers].sort((a, b) => a - b);

            // --- Lógica para manejar el As (1) después del Rey (13) ---
            let gaps = 0;
            let isValidSequence = false;

            // Opción 1: Secuencia normal (2-3-4... o A-2-3...)
            let normalGaps = 0;
            for (let i = 1; i < sortedNums.length; i++) {
                normalGaps += sortedNums[i] - sortedNums[i - 1] - 1;
            }

            // Opción 2: Secuencia "Vuelta" (Q-K-A, 12-13-1)
            // Esto solo es relevante si el 13 y el 1 están presentes.
            const hasOne = sortedNums.includes(1);
            const hasThirteen = sortedNums.includes(13);

            if (hasOne && hasThirteen) {
                // Si la secuencia es Q-K-A (12-13-1) o K-A (13-1), la diferencia 'normal' será grande (13-1 = 12 gaps).
                // Para calcular el gap real en la "vuelta", eliminamos el '1' y tratamos al '1' como '14' temporalmente,
                // pero solo para chequear si es una secuencia continua que usa el As como carta alta.

                // Verificamos si la secuencia es continua si el '1' se considera el número más grande.
                // Reemplazamos 1 por 14 para la lógica de continuidad
                const loopNums = sortedNums.map(n => n === 1 ? 14 : n);
                loopNums.sort((a, b) => a - b);

                let loopGaps = 0;
                for (let i = 1; i < loopNums.length; i++) {
                    loopGaps += loopNums[i] - loopNums[i - 1] - 1;
                }

                // Si el loopGaps es menor o igual a normalGaps, o si solo tenemos la vuelta (ej. [1, 13]), 
                // usamos la secuencia con 'vuelta' si es mejor/válida.
                if (loopGaps <= jokers.length) {
                    gaps = loopGaps;
                    isValidSequence = true;
                }

            }

            // Si la secuencia con vuelta no es válida o no existe (no tiene 1 y 13), usamos la normal.
            if (!isValidSequence || (normalGaps < gaps)) {
                gaps = normalGaps;
            }

            // Caso especial de A-2-3-12-13. Si el meld abarca el 13 y el 1, NO se permite:
            // Chequeamos si el rango de fichas (sin contar el 1) es mayor a 12 (ej. 2 a 13).
            // Si tiene 1 y 13, y el número más pequeño (excluyendo el 1) es menor a 12, está haciendo "círculo".
            if (hasOne && hasThirteen) {
                const minNumExcludingOne = sortedNums.length > 1 ? sortedNums[1] : 13;
                // Si la distancia entre el 13 y el 2 es grande, significa que el meld va desde bajo a alto.
                if (minNumExcludingOne < 12 && loopNums.length > 2) {
                    return false; // Prohíbe A-2...Q-K-A. Sólo se permite el As en un extremo.
                }
            }


            // los jokers pueden cubrir gaps; además la longitud total (nonJokers + jokers) debe ser >= 3
            return (gaps <= jokers.length) && (nonJokers.length + jokers.length >= 3);
        }

        // ===== GRUPO =====
        // Mismo número (entre no-comodines), colores distintos (no repetir color entre no-comodines)
        if (uniqueNumbers.size === 1) {
            // máximo 1 comodín (en total) — esta comprobación la garantizamos antes, pero la dejamos para seguridad
            if (jokers.length > 1) return false;
            return nonJokers.length + jokers.length >= 3;
        }

        return false;
    }

    // --- El resto de la función (manejo de comodines/2s) no cambia ---

    // 1) Intento sin convertir ningun "2" en comodín (solo jokers explícitos)
    const nonJokersBase = meld.filter(t => t.color !== "joker");
    const jokersBase = explicitJokers.slice();
    if (jokersBase.length > 1) return false;
    if (validateWith(nonJokersBase, jokersBase)) return true;

    // 2) Si falló, y NO hay jokers explícitos, intentamos usar exactamente UNA '2' como comodín (si existe)
    if (explicitJokers.length === 0 && twoTiles.length > 0) {
        for (const twoTile of twoTiles) {
            const nonJokers = [];
            let removed = false;
            for (const t of meld) {
                if (!removed && t.number === 2 && t.color !== "joker" && t === twoTile) {
                    removed = true;
                    continue;
                }
                if (t.color !== "joker") nonJokers.push(t);
            }
            const jokers = [{ color: "joker", number: null }];
            if (validateWith(nonJokers, jokers)) return true;
        }
    }

    // si nada funcionó, no es válido
    return false;
}
