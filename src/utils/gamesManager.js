'use server';

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { isValidMeld } from "./ValidGame";

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

    const points = await getTeamScores(gameId);

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
        points,
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
        centralPileLength: state.centralPile.length,
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

    if (state.centralPile.length === 0) {
        endGame(gameId);
    }

    const idx = players.findIndex(p => p.user_id === userId);
    const next = players[(idx + 1) % players.length].user_id;

    state.turnPlayer = next;
    state.turnStep = "choose_draw"; // 🔥 vuelve al inicio del ciclo

    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    await supabase
        .from('games')
        .update({ turn_player: next })
        .eq('id', gameId);

    if (error) throw error;

    if (state.playerHands[userId].length === 0) {
        await goToDeadPile(gameId, userId);
    }

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

function getTileValue(tile) {
    if (tile.color === "joker") return 50;
    if (tile.number === 1) return 15;
    if (tile.number === 2) return 20;
    if (tile.number >= 3 && tile.number <= 7) return 5;
    if (tile.number >= 8 && tile.number <= 13) return 10;
    return 0;
}

/**
 * Determina si un meld es un Burako (7 o más fichas).
 * Retorna 200 (Limpio), 100 (Sucio) o 0 (No Burako).
 */
function checkBurakoType(meld) {
    if (meld.length < 7) return 0;

    // 1. Verificar comodín explícito (Joker)
    const explicitJokers = meld.filter(t => t.color === "joker");
    if (explicitJokers.length > 0) return 100; // Si hay Joker, es Sucio.

    const twoTiles = meld.filter(t => t.number === 2);

    if (twoTiles.length > 0) {

        const nonWildNumbers = meld
            .filter(t => t.number !== 2 && t.color !== 'joker')
            .map(t => t.number);


        const uniqueNonWildNumbers = new Set(nonWildNumbers);
        if (uniqueNonWildNumbers.size > 1) {
            const hasThree = nonWildNumbers.includes(3);

            if (!hasThree) {
                return 100;
            }

            return 200;

        } else if (uniqueNonWildNumbers.size === 1 && twoTiles.length > 0) {

            return 100;
        }

        const colors = meld.map(t => t.color).filter(c => c !== 'joker');
        const uniqueColors = new Set(colors);

        if (uniqueColors.size === 1) {
            // Es una escalera. Si tiene un '2' y un '3', el '2' no es un comodín
            const hasThree = meld.some(t => t.number === 3);
            if (hasThree) {
                // El '2' está en su lugar A-2-3..., y no hay Joker explícito.
                return 200;
            }
        }
    }

    return 200;
}

function calculateMeldsScore(melds) {
    let baseValue = 0;
    let bonus = 0;

    for (const meld of melds) {
        if (Array.isArray(meld)) {
            for (const tile of meld) {
                baseValue += getTileValue(tile);
            }
            bonus += checkBurakoType(meld);
        }
    }
    return { baseValue, bonus };
}


export async function endGame(gameId, teamThatClosed) {
    const supabase = await createClient();
    const { state: currentState } = await _fetchState(gameId);

    // 1️⃣ Obtener la configuración del juego (puntos acumulados, maxPoints, participantes)
    const { data: gameRow, error: gameErr } = await supabase
        .from("games")
        .select("points_team_1, points_team_2, points, participants")
        .eq("id", gameId)
        .maybeSingle();

    if (gameErr || !gameRow) throw new Error("No se pudo obtener la información de la partida para finalizar el juego");

    const maxPoints = gameRow.points;
    const currentPointsTeam1 = gameRow.points_team_1 || 0;
    const currentPointsTeam2 = gameRow.points_team_2 || 0;
    const deadSize = gameRow.participants === 2 ? 22 : 11;

    // 2️⃣ Calcular puntajes de melds y bonificaciones por Burako
    const score1 = calculateMeldsScore(currentState.melds[1] || []);
    const score2 = calculateMeldsScore(currentState.melds[2] || []);

    // 3️⃣ Calcular puntos negativos de fichas en mano
    let negativePointsTeam1 = 0;
    let negativePointsTeam2 = 0;
    const players = await getOrderedPlayers(gameId);

    for (const player of players) {
        const hand = currentState.playerHands[player.user_id] || [];
        const handValue = hand.reduce((sum, tile) => sum + getTileValue(tile), 0);

        if (player.team === 1) negativePointsTeam1 += handValue;
        if (player.team === 2) negativePointsTeam2 += handValue;
    }

    // 4️⃣ Bonificaciones y Penalizaciones
    let closingBonusTeam1 = 0;
    let closingBonusTeam2 = 0;
    let deadPenaltyTeam1 = 0;
    let deadPenaltyTeam2 = 0;

    // Bonificación por "Cierre" (+100 puntos)
    if (teamThatClosed === 1) closingBonusTeam1 = 100;
    if (teamThatClosed === 2) closingBonusTeam2 = 100;

    // Penalización por "Muerto sin tocar" (-100 puntos)
    const isDeadTakenTeam1 = (currentState.teamReserves[1] || []).length < deadSize;
    const isDeadTakenTeam2 = (currentState.teamReserves[2] || []).length < deadSize;

    if (!isDeadTakenTeam1 && teamThatClosed !== 1) deadPenaltyTeam1 = 100;
    if (!isDeadTakenTeam2 && teamThatClosed !== 2) deadPenaltyTeam2 = 100;

    // 5️⃣ Sumar el total de la mano ANTES de aplicar la penalización por "Sin Burako"

    // Puntos Positivos Acumulados (Melds + Bonificaciones)
    let positiveScore1 = score1.baseValue + score1.bonus + closingBonusTeam1;
    let positiveScore2 = score2.baseValue + score2.bonus + closingBonusTeam2;

    // APLICACIÓN DE LA REGLA: SIN BURAKO
    // Si el bonus total del equipo es 0, significa que no hizo ningún Burako.
    if (score1.bonus === 0) {
        // El equipo 1 no hizo Burako. Sus puntos positivos se vuelven negativos.
        positiveScore1 = -positiveScore1;
    }
    if (score2.bonus === 0) {
        // El equipo 2 no hizo Burako. Sus puntos positivos se vuelven negativos.
        positiveScore2 = -positiveScore2;
    }

    // 6️⃣ Sumar el total de la mano (Positivos/Negativos de Melds - Puntos en Mano - Penalización Muerto)
    const handScoreTeam1 = positiveScore1 - negativePointsTeam1 - deadPenaltyTeam1;
    const handScoreTeam2 = positiveScore2 - negativePointsTeam2 - deadPenaltyTeam2;

    // Se corrigen las penalizaciones/negativos si la regla 'Sin Burako' lo exige:
    // La penalización del muerto y los puntos en mano SIEMPRE son negativos.
    // Lo que se vuelve negativo es el valor de las fichas bajadas (positiveScore).

    const newTotalPointsTeam1 = currentPointsTeam1 + handScoreTeam1;
    const newTotalPointsTeam2 = currentPointsTeam2 + handScoreTeam2;

    // 7️⃣ Actualizar puntajes y estado a "scoring"
    const { error: updateError } = await supabase
        .from("games")
        .update({
            points_team_1: newTotalPointsTeam1,
            points_team_2: newTotalPointsTeam2,
            status: "scoring",
        })
        .eq("id", gameId);

    if (updateError) throw updateError;

    // 8️⃣ Chequear si algún equipo ganó la partida
    if (newTotalPointsTeam1 >= maxPoints || newTotalPointsTeam2 >= maxPoints) {
        const winner = newTotalPointsTeam1 >= maxPoints ? 1 : 2;
        await supabase.from("games").update({ status: "finished" }).eq("id", gameId);
        return {
            status: "finished",
            winner,
            score: { 1: newTotalPointsTeam1, 2: newTotalPointsTeam2 }
        };
    }

    // 9️⃣ Reiniciar el juego para la próxima mano (Nuevo Estado Inicial)
    const newInitialState = await createInitialBurakoState(gameId);

    const { error: upsertErr } = await supabase.from("game_state").upsert({
        game_id: gameId,
        state: newInitialState,
    });
    if (upsertErr) throw upsertErr;

    const { error: turnErr } = await supabase
        .from("games")
        .update({
            turn_player: newInitialState.turnPlayer,
            status: "playing",
        })
        .eq("id", gameId);
    if (turnErr) throw turnErr;

    return {
        status: "new_hand",
        score: { 1: newTotalPointsTeam1, 2: newTotalPointsTeam2 },
        handScore: { 1: handScoreTeam1, 2: handScoreTeam2 },
        newState: newInitialState
    };
}
export async function goToDeadPile(gameId, userId) {
    const { state, supabase } = await _fetchState(gameId);


    // 1️⃣ Obtener el equipo del jugador
    const { data: playerRow, error: playerErr } = await supabase
        .from("game_players")
        .select("team")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();

    if (playerErr) throw playerErr;
    if (!playerRow) throw new Error("El usuario no pertenece a la partida");

    const team = playerRow.team;
    const deadPile = state.teamReserves[team] || [];

    // 2️⃣ Validar si el jugador ha vaciado su mano (requisito para ir al muerto)
    const playerHand = state.playerHands[userId] || [];
    if (playerHand.length > 0) {
        throw new Error("Debes quedarte sin fichas en la mano antes de ir al muerto");
    }

    // 3️⃣ Validar si el equipo ya tomó la reserva (REGLA DE FIN DE PARTIDA)
    // Si deadPile está vacío, significa que el equipo ya tomó la reserva.
    if (deadPile.length === 0) {
        // El equipo ya tomó la reserva. Esto significa que el jugador está "cerrando" por segunda vez.
        // La partida debe terminar inmediatamente y el equipo contrario debe recibir la bonificación por cierre.

        const winningTeam = team === 1 ? 2 : 1; // El equipo contrario gana la mano.

        // Llamamos a endGame con el equipo ganador de la mano.
        const result = await endGame(gameId, winningTeam);

        // El estado de la partida ya fue actualizado dentro de endGame (new_hand o finished)
        return {
            action: "game_ended",
            message: `El equipo ${team} intentó ir al muerto por segunda vez. La partida termina y el Equipo ${winningTeam} gana la mano.`,
            result
        };

    }

    // 4️⃣ Transferir la reserva del equipo a la mano del jugador

    // Añadir las fichas a la mano del jugador
    state.playerHands[userId].push(...deadPile);

    // Vaciar la reserva del equipo (marcando que fue tomada)
    state.teamReserves[team] = [];

    // 5️⃣ Actualizar el estado del juego
    // El turno NO CAMBIA, y el paso del turno se mantiene en "melds" para que el jugador pueda jugar las fichas del muerto.

    const { error } = await supabase.from("game_state").update({ state }).eq("game_id", gameId);
    if (error) throw error;

    return {
        action: "dead_pile_taken",
        message: `¡Te has ido al muerto! Tienes ${deadPile.length} fichas nuevas.`,
        newState: state
    };
}

export async function getTeamScores(gameId) {
    const supabase = await createClient();

    const { data: gameRow, error: gameErr } = await supabase
        .from("games")
        .select("points_team_1, points_team_2")
        .eq("id", gameId)
        .maybeSingle();

    if (gameErr) {
        throw new Error(`Error al consultar puntajes: ${gameErr.message}`);
    }

    if (!gameRow) {
        // Esto podría ocurrir si el gameId no existe
        throw new Error(`Partida con ID ${gameId} no encontrada.`);
    }

    // Retorna los puntajes, usando 0 si aún no están inicializados (primera mano)
    return {
        team1: gameRow.points_team_1 || 0,
        team2: gameRow.points_team_2 || 0,
    };
}