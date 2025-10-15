'use server';

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const getUserId = async () => {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("No se pudo obtener el usuario actual");
    return user.id;
};

export async function createGame(participants, points) {

    const supabase = await createClient();

    const userId = await getUserId();

    // Crear el juego
    const { data: game, error: gameError } = await supabase
        .from("games")
        .insert([
            {
                created_by: userId,
                status: "waiting",
                turn_player: null,
                participants,
                points,
            },
        ])
        .select()
        .single();

    if (gameError) {
        console.error("Error creando el juego:", gameError);
        throw gameError;
    }

    // Agregar al creador como jugador
    const { error: playerError } = await supabase.from("game_players").insert([
        {
            game_id: game.id,
            user_id: userId,
            team: 1,
        },
    ]);

    if (playerError) {
        console.error("Error agregando jugador:", playerError);
        throw playerError;
    }

    // Crear estado inicial
    const initialState = {
        board: [],
        turn: 1,
        phase: "waiting",
    };

    const { error: stateError } = await supabase.from("game_state").insert([
        {
            game_id: game.id,
            state: initialState,
        },
    ]);

    if (stateError) {
        console.error("Error creando estado:", stateError);
        throw stateError;
    }

    return game;
}

export async function getPendingGames() {
    const supabase = await createClient()
    const userId = await getUserId()

    const { data: games, error } = await supabase
        .from("games")
        .select(`
            *,
            created_by_user:created_by (username),
            game_players (
                id,
                user_id,
                team,
                users!inner (username)
            )
        `)
        .in("status", ["waiting", "playing"]);

    if (error) {
        console.error("Error obteniendo partidas:", error)
        throw error
    }

    if (!games?.length) {
        console.log("No se encontraron partidas.")
        return []
    }

    const result = games
        .filter(game =>
            game.game_players.some(p => p.user_id === userId) // aquí filtramos solo los juegos donde estamos
        )
        .map((game) => {
            const players = game.game_players.map((p) => ({
                id: p.user_id,
                username: p.users?.username || "Desconocido",
                team: p.team,
                order: p.player_order,
            }))

            const currentPlayer = players.find((p) => p.id === userId)

            let teammate = null
            if (players.length === 4 && currentPlayer) {
                teammate = players.find(
                    (p) => p.team === currentPlayer.team && p.id !== userId
                )
            }

            return {
                id: game.id,
                status: game.status,
                created_by: game.created_by_user?.username || "Desconocido",
                points: game.points,
                players,
                myTeam: currentPlayer?.team ?? null,
                teammate: teammate ?? null,
                code: game.code,
            }
        })

    console.log("Partidas pendientes obtenidas:", result)
    return result
}

export async function joinGame(gameCode) {
    const supabase = await createClient();
    const userId = await getUserId();

    // 1️⃣ Buscar el ID del juego y su máximo de participantes
    const { data: game, error: gameError } = await supabase
        .from("games")
        .select("id, participants")
        .eq("code", gameCode)
        .maybeSingle();

    if (gameError || !game) throw new Error("No se encontró la partida con ese código");

    const gameId = game.id;

    // 2️⃣ Contar cuántos jugadores hay actualmente en la partida
    const { count: currentCount, error: countError } = await supabase
        .from("game_players")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId);

    if (countError) throw countError;

    // 3️⃣ Validar si ya está llena
    if (currentCount >= game.participants) {
        throw new Error("La partida ya alcanzó el número máximo de jugadores");
    }

    // 4️⃣ Verificar si el usuario ya está dentro
    const { data: existingPlayer, error: checkError } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();

    if (checkError) throw checkError;
    if (existingPlayer) throw new Error("Ya estás en la partida");

    // 5️⃣ Insertar al jugador
    const { error: insertError } = await supabase.from("game_players").insert({
        game_id: gameId,
        user_id: userId,
        team: null, // se asignará luego
    });

    if (insertError) throw insertError;

    return { gameId };
}

export async function getGameInformation(gameId) {
    const supabase = await createClient();
    const userId = await getUserId();

    // Obtener la partida
    const { data: game, error: gameError } = await supabase
        .from("games")
        .select(`
            *,
            created_by_user:created_by (username),
            game_players (
                id,
                user_id,
                team,
                users!inner (username)
            )
        `)
        .eq("id", gameId)
        .maybeSingle();

    if (!game || gameError) {
        redirect('/')
    };

    // 🧩 Verificar si el jugador actual pertenece a la partida
    const isInGame = game.game_players.some((p) => p.user_id === userId);
    if (!isInGame) {
        redirect('/')

    };

    if (game.status === "playing") {
        redirect("/rooms/" + game.code + "/started");
    }

    // Si la partida está esperando jugadores
    const players = game.game_players.map((p) => ({
        id: p.user_id,
        username: p.users?.username || "Desconocido",
        team: p.team,
    }));

    // Determinar equipo del jugador actual
    const currentPlayer = players.find((p) => p.id === userId);

    const teamNumbers = [1, 2];
    const teams = {};
    const freeSlots = {};

    teamNumbers.forEach((t) => {
        teams[t] = players.filter((p) => p.team === t);
        freeSlots[t] = game.participants / 2 - teams[t].length;
    });

    return {
        status: "waiting",
        id: game.id,
        points: game.points,
        created_by_uuid: game.created_by,
        created_by: game.created_by_user?.username || "Desconocido",
        players,
        myTeam: currentPlayer?.team ?? null,
        teams,
        freeSlots,
    };
}

export async function changeTeam(gameId, newTeam) {
    const supabase = await createClient();
    const userId = await getUserId();

    // Eliminar cualquier registro previo del jugador en esta partida
    await supabase
        .from("game_players")
        .delete()
        .eq("game_id", gameId)
        .eq("user_id", userId);

    // Insertar nuevo equipo
    const { error } = await supabase.from("game_players").insert({
        game_id: gameId,
        user_id: userId,
        team: newTeam,
    });

    if (error) throw error;
}


function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function chunkIntoNPiles(array, n) {
    const base = Math.floor(array.length / n);
    let remainder = array.length % n;
    let idx = 0;
    const result = [];
    for (let i = 0; i < n; i++) {
        const size = base + (remainder > 0 ? 1 : 0);
        remainder--;
        result.push(array.slice(idx, idx + size));
        idx += size;
    }
    return result;
}
// ====================== CREAR ESTADO INICIAL ======================
export async function createInitialBurakoState(gameId) {
    const supabase = await createClient();

    // Obtener configuración de la partida (cantidad de participantes)
    const { data: gameRow, error: gameErr } = await supabase
        .from("games")
        .select("participants")
        .eq("id", gameId)
        .maybeSingle();

    if (gameErr || !gameRow) {
        throw new Error("No se pudo obtener la información del juego");
    }

    const participants = gameRow.participants;

    if (participants !== 2 && participants !== 4) {
        throw new Error("Esta implementación sólo soporta 2 o 4 participantes (según reglas solicitadas).");
    }

    // Obtener jugadores de la partida (ordenados)
    const { data: players } = await supabase
        .from("game_players")
        .select("user_id, team")
        .eq("game_id", gameId)
        .order("order_player", { ascending: true });

    if (!players || players.length !== participants) {
        throw new Error(
            `La cantidad de jugadores registrados (${players?.length ?? 0}) no coincide con 'participants' (${participants}).`
        );
    }

    // Generar mazo (4 colores x 1..13 x 2 copias) + 2 jokers
    const colors = ["red", "yellow", "blue", "black"];
    const numbers = Array.from({ length: 13 }, (_, i) => i + 1);
    const jokers = [{ color: "joker", number: null }, { color: "joker", number: null }];

    let allTiles = [];
    colors.forEach(color => {
        numbers.forEach(num => {
            // 2 copias de cada ficha color/numero
            allTiles.push({ color, number: num });
            allTiles.push({ color, number: num });
        });
    });
    allTiles = allTiles.concat(jokers);

    shuffleArray(allTiles);

    // Reparto: cada jugador recibe 11 fichas (siempre)
    const playerHands = {};
    const tilesPerPlayer = 11;
    players.forEach((p) => {
        playerHands[p.user_id] = allTiles.splice(0, tilesPerPlayer);
    });

    // Determinar tamaño del "muerto" (reserva por equipo)
    // Si es partida de 2 jugadores -> 22 fichas por jugador (es decir 22 por cada "equipo" = cada jugador)
    // Si es partida de 4 jugadores -> 11 fichas por equipo
    const deadSize = participants === 2 ? 22 : 11;

    // Reservas por equipo (teamReserves: {1: [], 2: []})
    const teamReserves = { 1: [], 2: [] };
    teamReserves[1] = allTiles.splice(0, deadSize);
    teamReserves[2] = allTiles.splice(0, deadSize);

    // El resto -> pila central (mazo para robar)
    const centralPile = allTiles.slice(); // copia de lo que queda

    // Turno inicial: jugador aleatorio entre los participantes
    const randomIndex = Math.floor(Math.random() * players.length);
    const turnPlayer = players[randomIndex].user_id;

    return {
        centralPile,
        playerHands,
        teamReserves,
        // Aquí: guardamos melds por team en lugar de por usuario
        melds: { 1: [], 2: [] }, // cada elemento será un array de "melds" (cada meld = array de fichas)
        discardPile: [],
        turnPlayer,
        phase: "playing",
        turnStep: "choose_draw",
    };
}

// ====================== INICIAR PARTIDA ======================
export async function startGame(gameId) {
    const supabase = await createClient();
    const userId = await getUserId();

    // Cambiar estado del juego a "playing"
    const { error: statusError } = await supabase.from("games").update({ status: "playing" }).eq("id", gameId);
    if (statusError) {
        console.error("Error actualizando estado de la partida:", statusError);
        throw statusError;
    }

    // Crear estado inicial (según reglas)
    const initialState = await createInitialBurakoState(gameId);

    // Guardar en game_state (upsert para permitir reintentos)
    const { error: upsertErr } = await supabase.from("game_state").upsert({
        game_id: gameId,
        state: initialState,
    });
    if (upsertErr) {
        console.error("Error guardando estado inicial:", upsertErr);
        throw upsertErr;
    }

    // Actualizar turno inicial en la tabla games (campo turn_player)
    const { error: turnErr } = await supabase
        .from("games")
        .update({ turn_player: initialState.turnPlayer })
        .eq("id", gameId);
    if (turnErr) {
        console.error("Error actualizando turno inicial en games:", turnErr);
        throw turnErr;
    }

    return initialState;
}

// ====================== ESTADO DE UN JUGADOR ======================
export async function getPlayerGameState(gameId, userId) {
    const supabase = await createClient();

    const { data: stateRow, error: stateErr } = await supabase
        .from("game_state")
        .select("state")
        .eq("game_id", gameId)
        .maybeSingle();

    if (stateErr) {
        console.error("Error obteniendo estado de la partida:", stateErr);
        throw stateErr;
    }
    if (!stateRow || !stateRow.state) {
        redirect("/");
    }
    const state = stateRow.state;
    console.log("state", state);
    const { data: playerRow, error: playerErr } = await supabase
        .from("game_players")
        .select("team")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();

    if (playerErr) {
        console.error("Error obteniendo datos del jugador:", playerErr);
        throw playerErr;
    }
    if (!playerRow) {
        throw new Error("El usuario no forma parte de esta partida");
    }

    const team = playerRow.team;

    // devolvemos melds por equipo (y también la lista completa si hace falta)
    return {
        myPlayerId: userId,
        myTeam: team,
        myHand: state.playerHands ? state.playerHands[userId] || [] : [],
        meldsByTeam: state.melds || { 1: [], 2: [] }, // formato: {1: [meld, ...], 2: [meld, ...]}
        myTeamMelds: (state.melds && state.melds[team]) || [],
        discardPile: state.discardPile || [],
        turnPlayer: state.turnPlayer,
        phase: state.phase,
        turnStep: state.turnStep,
    };
}


// Helper: obtener lista de jugadores ordenada (array de { user_id, team, order_player })
async function getOrderedPlayers(gameId) {
    const supabase = await createClient();
    const { data: players, error } = await supabase
        .from("game_players")
        .select("user_id, team, order_player")
        .eq("game_id", gameId)
        .order("order_player", { ascending: true });

    if (error) throw error;
    return players || [];
}
async function _fetchState(gameId) {
    const supabase = await createClient();
    const { data: stateRow, error } = await supabase
        .from("game_state")
        .select("state")
        .eq("game_id", gameId)
        .maybeSingle();
    if (error) throw error;
    return { state: stateRow.state, supabase };
}

// 1️⃣ Elegir robar (deck o discard)
export async function chooseDraw(gameId, userId, source = "deck") {
    const { state, supabase } = await _fetchState(gameId);
    if (state.turnPlayer !== userId) throw new Error("No es tu turno");
    if (state.turnStep !== "choose_draw") throw new Error("No puedes robar en este paso");

    if (source === "deck") {

        if (!state.centralPile?.length) throw new Error("El mazo está vacío");

        const drawnTile = state.centralPile.pop();
        state.playerHands[userId].push(drawnTile);
        state.lastDrawn = { by: userId, source, tiles: [drawnTile] };
    } else {
        if (!state.discardPile?.length) throw new Error("La pila de descartes está vacía");

        const takenTiles = [...state.discardPile];

        state.playerHands[userId].push(...takenTiles);

        state.discardPile = [];

        state.lastDrawn = { by: userId, source, tiles: takenTiles };
    }

    state.turnStep = "melds"; // 🔥 siguiente fase del turno
    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    if (error) throw error;
    return state;
}
function isValidMeld(meld) {
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
            let gaps = 0;
            for (let i = 1; i < sortedNums.length; i++) {
                gaps += sortedNums[i] - sortedNums[i - 1] - 1;
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

    // 1) Intento sin convertir ningun "2" en comodín (solo jokers explícitos)
    const nonJokersBase = meld.filter(t => t.color !== "joker");
    const jokersBase = explicitJokers.slice(); // copia
    // rechazo rápido si hay más de 1 jokers explícitos (lo chequeamos arriba) o longitud total < 3
    if (jokersBase.length > 1) return false;
    if (validateWith(nonJokersBase, jokersBase)) return true;

    // 2) Si falló, y NO hay jokers explícitos, intentamos usar exactamente UNA '2' como comodín (si existe)
    // Nota: solo intentamos esto si no hay comodín explícito (porque la regla es max 1 comodín por juego/meld)
    if (explicitJokers.length === 0 && twoTiles.length > 0) {
        // por cada 2 posible, probamos convertir esa ficha en comodín (pero solo 1 a la vez)
        for (const twoTile of twoTiles) {
            // construir nonJokers quitando la ficha twoTile específica
            const nonJokersAttempt = meld.filter(
                (t, i) => !(t.number === 2 && t.color === twoTile.color && t !== twoTile)
            );
            // la forma segura: crear arrays por índice para quitar exactamente una instancia
            // mejor: quitar por referencia (si el objeto coincide)
            const nonJokers = [];
            let removed = false;
            for (const t of meld) {
                if (!removed && t.number === 2 && t.color !== "joker" && t === twoTile) {
                    removed = true; // esta la usamos como comodín => no la añadimos a nonJokers
                    continue;
                }
                if (t.color !== "joker") nonJokers.push(t);
            }
            const jokers = [{ color: "joker", number: null }]; // simulamos un comodín usado (1)
            // validar
            if (validateWith(nonJokers, jokers)) return true;
            // si no, seguimos probando con otra '2'
        }
    }

    // si nada funcionó, no es válido
    return false;
}


export async function submitMelds(gameId, userId, meld = []) {
    const { state, supabase } = await _fetchState(gameId);
    if (state.turnPlayer !== userId) throw new Error("No es tu turno");
    if (state.turnStep !== "melds") throw new Error("No puedes bajar melds en este paso");

    // Validar el meld
    if (!isValidMeld(meld)) {
        throw new Error("El juego que intentas bajar no cumple las reglas del Burako.");
    }

    // Obtener el team del jugador que está bajando
    const { data: playerRow, error: playerErr } = await supabase
        .from("game_players")
        .select("team")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();

    if (playerErr) throw playerErr;
    if (!playerRow) throw new Error("El usuario no pertenece a la partida");

    const team = playerRow.team;

    // Inicializar estructura si no existe
    state.melds = state.melds || { 1: [], 2: [] };

    // Guardar el meld dentro del array de melds del team
    // IMPORTANTE: usamos concat([meld]) para añadir el meld como elemento (no aplastar el array)
    state.melds[team] = (state.melds[team] || []).concat([meld]);

    // Quitar fichas bajadas de la mano del jugador
    const hand = state.playerHands[userId] || [];

    for (const tile of meld) {
        const idx = hand.findIndex(
            h => h.color === tile.color && h.number === tile.number
        );
        if (idx !== -1) hand.splice(idx, 1);
    }

    state.playerHands[userId] = hand;

    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    if (error) throw error;
    return state;
}


export async function addTilesToMeld(gameId, userId, target, meldIndex, tiles = []) {
    const { state, supabase } = await _fetchState(gameId);
    if (state.turnPlayer !== userId) throw new Error("No es tu turno");
    if (state.turnStep !== "melds") throw new Error("Solo puedes agregar fichas en la fase de bajar melds");

    // 1. Obtener el equipo del usuario que está realizando la acción (userId)
    const { data: userTeamRow, error: userTeamErr } = await supabase
        .from("game_players")
        .select("team")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();

    if (userTeamErr) throw userTeamErr;
    if (!userTeamRow) throw new Error("El usuario no pertenece a la partida");
    const actingUserTeam = userTeamRow.team;

    // 2. Determinar team destino (targetTeam)
    let targetTeam = null;
    if (target === 1 || target === 2 || target === '1' || target === '2') {
        targetTeam = Number(target);
    } else {
        // asumimos que target es un userId, buscamos su team
        const { data: pRow, error: pErr } = await supabase
            .from("game_players")
            .select("team")
            .eq("game_id", gameId)
            .eq("user_id", target)
            .maybeSingle();
        if (pErr) throw pErr;
        if (!pRow) throw new Error("El jugador objetivo no pertenece a la partida");
        targetTeam = pRow.team;
    }

    // 3. **NUEVA VALIDACIÓN:** Asegurar que el meld destino pertenece al equipo del usuario que agrega las fichas.
    if (actingUserTeam !== targetTeam) {
        throw new Error("Solo puedes agregar fichas a los juegos de tu propio equipo");
    }

    // Validar existencia de melds por team
    state.melds = state.melds || { 1: [], 2: [] };
    if (!state.melds[targetTeam] || !state.melds[targetTeam][meldIndex]) {
        throw new Error("El juego al que intentas agregar fichas no existe");
    }

    const meld = state.melds[targetTeam][meldIndex];
    const newMeld = meld.concat(tiles);

    if (!isValidMeld(newMeld)) {
        throw new Error("Las fichas agregadas no forman un juego válido según las reglas");
    }

    // Validar y remover de la mano del jugador que añade
    const hand = state.playerHands[userId];
    for (const tile of tiles) {
        const idx = hand.findIndex(h => h.color === tile.color && h.number === tile.number);
        if (idx === -1) throw new Error(`No tienes la ficha ${tile.color} ${tile.number}`);
        hand.splice(idx, 1);
    }

    // Actualizar el meld existente en team
    state.melds[targetTeam][meldIndex] = newMeld;
    state.playerHands[userId] = hand;

    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    if (error) throw error;
    return state;
}
// 3️⃣ Descartar una ficha
export async function discardTile(gameId, userId, tileIdentifier) {
    const { state, supabase } = await _fetchState(gameId);

    if (state.turnPlayer !== userId) throw new Error("No es tu turno");
    if (state.turnStep !== "melds") throw new Error("No puedes descartar en este paso");

    const hand = state.playerHands[userId];
    let removedTile = null;
    if (typeof tileIdentifier === "number") {
        removedTile = hand.splice(tileIdentifier, 1)[0];
    } else {
        const idx = hand.findIndex(h => h.color === tileIdentifier.color && h.number === tileIdentifier.number);
        removedTile = hand.splice(idx, 1)[0];
    }
    state.playerHands[userId] = hand;
    state.discardPile.push(removedTile);

    // siguiente turno
    const { data: players } = await supabase
        .from("game_players")
        .select("user_id")
        .eq("game_id", gameId)
        .order("order_player", { ascending: true });

    const idx = players.findIndex(p => p.user_id === userId);
    console.log("idx", idx);
    console.log("players", players);
    const next = players[(idx + 1) % players.length].user_id;
    console.log("next", next);

    state.turnPlayer = next;
    state.turnStep = "choose_draw"; // 🔥 vuelve al inicio del ciclo


    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    await supabase
        .from('games')
        .update({ turn_player: next })
        .eq('id', gameId);

    if (error) throw error;
    return state;
}

export async function passTurn(gameId, userId) {
    const { state, supabase } = await _fetchState(gameId);
    if (state.turnPlayer !== userId) throw new Error("No es tu turno");
    if (state.turnStep !== "melds") throw new Error("No puedes pasar en este paso");

    state.turnStep = "discard"; // 🔥 vuelve al inicio del ciclo

    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    if (error) throw error;
    return state;
}
