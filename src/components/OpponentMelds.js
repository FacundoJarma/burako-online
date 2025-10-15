import React, { useMemo } from "react";
import Tile from "./Tile";
import { orderMeldsForDisplaySimple } from "@/utils/NormalizeGames";

export default function OpponentMelds({ myMeld = [] }) {
    const orderedMelds = useMemo(() => {
        try {
            return orderMeldsForDisplaySimple(Array.isArray(myMeld) ? myMeld : []);
        } catch (e) {
            console.error("orderMeldsForDisplaySimple error:", e);
            return [];
        }
    }, [myMeld]);

    return (
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-[40em] max-w-full px-4">
            <div className="flex flex-wrap  bg-black/30 p-2 gap-2 rounded-lg shadow-xl min-h-20">

                {orderedMelds.length === 0 && (
                    <p className="text-gray-500 italic p-2">No se han bajado fichas.</p>
                )}

                {orderedMelds.map((meld, mIndex) => {
                    const meldKey = `meld-group-${mIndex}`;

                    return (
                        <div
                            key={meldKey}
                            className="flex items-center gap-1 p-1"
                        >
                            {meld.map((tile, tIndex) => {
                                const tileKey = `meld-${mIndex}-tile-${tIndex}-${tile?.color ?? "x"}-${tile?.number ?? "n"}`;
                                return (
                                    <div key={tileKey} className="flex items-center justify-center">
                                        <Tile card={tile} />
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}