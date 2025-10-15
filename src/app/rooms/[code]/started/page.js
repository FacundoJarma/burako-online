"use client";
import React, { useEffect, useState, useCallback } from "react";
import { redirect, useParams } from "next/navigation";
import { useGameState } from "@/hooks/UseGameState";
import { addTilesToMeld, chooseDraw, discardTile, getUserId, passTurn, submitMelds } from "@/utils/gamesManager";
import MyHand from "@/components/MyHand";
import DiscardPile from "@/components/DiscardPile";
import GamePile from "@/components/GamePile";
import MyMelds from "@/components/MyMelds";
import OpponentMelds from "@/components/OpponentMelds";

function StartedGamePage() {
    const params = useParams();
    const code = params?.code;
    const { turnPlayerId, gameState, gameStatus, gameId, isMyTurn } = useGameState(code);

    const [userId, setUserId] = useState(null);
    const [selectedCards, setSelectedCards] = useState([]);
    const [loading, setLoading] = useState({ draw: false, meld: false, discard: false });
    const [error, setError] = useState(null);

    // Obtener el ID del usuario
    useEffect(() => {
        (async () => {
            try {
                const u = await getUserId();
                if (!u) return redirect("/");
                setUserId(u);
            } catch (e) {
                console.error(e);
                redirect("/");
            }
        })();
    }, []);

    // Reset selección si cambia el turno o la mano
    useEffect(() => {
        setSelectedCards([]);
        setError(null);
        console.log(gameState);

    }, [turnPlayerId, gameState?.myHand?.length]);



    // === 1️⃣ Robar carta ===
    async function handleDraw(source) {
        if (!isMyTurn || gameState?.turnStep !== "choose_draw") return;
        console.log("handleDraw", source);
        setError(null);
        setLoading((s) => ({ ...s, draw: true }));
        try {
            await chooseDraw(gameId, userId, source);
            setSelectedCards([]);

        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading((s) => ({ ...s, draw: false }));
            setSelectedCards([]);
        }
    }

    // === 2️⃣ Bajar melds ===
    async function handleSubmitMelds() {
        if (!isMyTurn || gameState?.turnStep !== "melds") return;
        if (!selectedCards?.length) {
            setError("Seleccioná al menos una ficha para bajar o presioná 'Pasar'.");
            return;
        }
        setError(null);
        setLoading((s) => ({ ...s, meld: true }));
        try {
            console.log("selectedCards", selectedCards);
            await submitMelds(gameId, userId, selectedCards);
            setSelectedCards([]);
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading((s) => ({ ...s, meld: false }));
            setSelectedCards([]);

        }
    }

    // === 3️⃣ Descartar ===
    async function handleDiscard() {
        if (!isMyTurn || gameState?.turnStep !== "melds") return;
        if (selectedCards.length !== 1) {
            setError("Seleccioná exactamente 1 ficha para descartar.");
            return;
        }
        setError(null);
        setLoading((s) => ({ ...s, discard: true }));
        try {
            console.log("selectedCards", selectedCards);
            await discardTile(gameId, userId, selectedCards[0]);

            setSelectedCards([]);
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading((s) => ({ ...s, discard: false }));
            setSelectedCards([]);

        }
    }

    async function handleAddToMeld(meldID) {
        if (!isMyTurn || gameState?.turnStep !== "melds" || selectedCards.length === 0) return;
        setSelectedCards((s) => [...s, meldID]);

        setError(null);
        setLoading((s) => ({ ...s, meld: true }));
        try {
            await addTilesToMeld(gameId, userId, gameState?.myTeam, meldID, selectedCards);
            setSelectedCards([]);
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading((s) => ({ ...s, meld: false }));
            setSelectedCards([]);

        }
    }


    // === Render principal ===
    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white gap-2">

            <div className="flex justify-center gap-5">
                <OpponentMelds myMeld={gameState?.myTeam == 1 ? gameState?.meldsByTeam[2] : gameState?.meldsByTeam[1] ?? []} />
                <MyMelds handleSubmitMelds={handleSubmitMelds} handleAddToMeld={handleAddToMeld} myMeld={gameState?.myTeamMelds ?? []} />

                <div className="absolute bottom-12 flex justify-around gap-10 items-center">
                    <GamePile turnStep={gameState?.turnStep} isMyTurn={isMyTurn} handleDraw={handleDraw} />
                    <MyHand
                        hand={gameState?.myHand ?? []}
                        onChange={() => { }}
                        onSelectionChange={setSelectedCards}
                    />
                    <DiscardPile handleDiscard={handleDiscard} discardPile={gameState?.discardPile ?? []} turnStep={gameState?.turnStep} isMyTurn={isMyTurn} handleDraw={handleDraw} />

                </div>

            </div>

            {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

            {isMyTurn && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 py-2 px-4 bg-green-600/20 border border-green-700 rounded-xl text-center font-semibold">
                    ¡Es tu turno!
                </div>
            )}
        </div>
    );
}

export default StartedGamePage;
