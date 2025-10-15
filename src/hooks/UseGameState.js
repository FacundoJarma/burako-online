import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { getUserId, getPlayerGameState } from "@/utils/gamesManager";

const supabase = createClient();

/**
 * Hook para obtener el estado del juego Burako para un jugador específico.
 * Devuelve:
 * - turnPlayerId: UUID del jugador que tiene el turno
 * - gameState: estado filtrado del juego (solo las fichas del jugador y elementos visibles)
 * - gameStatus: "waiting" o "playing"
 * - gameId: ID interno del juego
 * - isMyTurn: booleano que indica si es el turno del jugador actual
 */
export function useGameState(gameCode) {
    const [turnPlayerId, setTurnPlayerId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [gameStatus, setGameStatus] = useState("waiting");
    const [gameId, setGameId] = useState(null);

    useEffect(() => {
        if (!gameCode) return;

        let mounted = true;
        let gameChannel = null;
        let stateChannel = null;

        async function init() {
            try {
                const userId = await getUserId();

                // 1️⃣ Buscar el ID del juego por su código
                const { data: gameRow, error: gameError } = await supabase
                    .from("games")
                    .select("id, status, turn_player")
                    .eq("code", gameCode)
                    .maybeSingle();

                if (gameError || !gameRow) {
                    redirect("/");
                    return;
                }

                const id = gameRow.id;
                if (!mounted) return;

                setGameId(id);
                setTurnPlayerId(gameRow.turn_player);
                setGameStatus(gameRow.status);

                // 2️⃣ Obtener el estado inicial del jugador
                const playerState = await getPlayerGameState(id, userId);
                if (!mounted) return;
                setGameState(playerState);

                // 3️⃣ Suscribirse a cambios en la tabla "games"
                gameChannel = supabase
                    .channel(`games:${id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "UPDATE",
                            schema: "public",
                            table: "games",
                            filter: `id=eq.${id}`,
                        },
                        (payload) => {
                            const updated = payload.new;
                            if (!mounted) return;
                            setTurnPlayerId(updated.turn_player);
                            setGameStatus(updated.status);

                            // Si la partida vuelve a "waiting", volver al lobby
                            if (updated.status === "waiting") {
                                redirect(`/rooms/${gameCode}`);
                            }
                        }
                    )
                    .subscribe();

                // 4️⃣ Suscribirse a cambios en "game_state"
                stateChannel = supabase
                    .channel(`game_state:${id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "game_state",
                            filter: `game_id=eq.${id}`,
                        },
                        async () => {
                            try {
                                const updatedState = await getPlayerGameState(id, userId);
                                if (!mounted) return;
                                setGameState(updatedState);
                            } catch (err) {
                                console.error("Error actualizando estado del jugador:", err);
                            }
                        }
                    )
                    .subscribe();
            } catch (err) {
                console.error(err);
            }
        }

        init();

        // Cleanup al desmontar
        return () => {
            mounted = false;
            try {
                if (gameChannel) supabase.removeChannel(gameChannel);
                if (stateChannel) supabase.removeChannel(stateChannel);
            } catch (e) {
                // ignorar
            }
        };
    }, [gameCode]);

    // 5️⃣ Calcular si es el turno del jugador actual
    const isMyTurn = useMemo(() => {
        return turnPlayerId && gameState?.myPlayerId === turnPlayerId;
    }, [turnPlayerId, gameState]);

    return { turnPlayerId, gameState, gameStatus, gameId, isMyTurn };
}
