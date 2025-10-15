import { useEffect, useState } from "react";
import { getGameInformation } from "@/utils/gamesManager";
import { createClient } from "@/utils/supabase/client";
import { redirect, useRouter } from "next/navigation";

const supabase = createClient();

export function useGameLobby(gameCode) {
    const [lobby, setLobby] = useState(null);
    const [gameId, setGameId] = useState(null);
    const router = useRouter();

    useEffect(() => {
        if (!gameCode) return;

        async function fetchGame() {
            // 1️⃣ Buscar el ID del juego
            const { data: gameRow, error: gameError } = await supabase
                .from("games")
                .select("id")
                .eq("code", gameCode)
                .maybeSingle();

            if (gameError || !gameRow) {
                redirect("/");
            }

            const id = gameRow.id;
            setGameId(id);

            // 2️⃣ Obtener la información completa
            const info = await getGameInformation(id);
            if (!info) {
                router.replace("/");
                return;
            }
            setLobby(info);

            // 3️⃣ Suscribirse a los jugadores (como ya hacías)
            const playersChannel = supabase
                .channel(`game_players:${id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "game_players",
                        filter: `game_id=eq.${id}`,
                    },
                    async () => {
                        const updated = await getGameInformation(id);
                        setLobby(updated);
                    }
                )
                .subscribe();

            // 4️⃣ Suscribirse a cambios del estado del juego
            const gameChannel = supabase
                .channel(`games:${id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "games",
                        filter: `id=eq.${id}`,
                    },
                    async (payload) => {
                        const newStatus = payload.new.status;
                        if (newStatus === "playing") {
                            router.push(`/rooms/${gameCode}/started`);
                        } else {
                            const updated = await getGameInformation(id);
                            setLobby(updated);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(playersChannel);
                supabase.removeChannel(gameChannel);
            };
        }

        fetchGame();
    }, [gameCode]);

    return { lobby, setLobby, gameId };
}
