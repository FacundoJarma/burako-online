import React, { useMemo } from "react";
import Tile from "./Tile";
import { orderMeldsForDisplaySimple } from "@/utils/NormalizeGames";

export default function MyMelds({ myMeld = [], handleAddToMeld, handleSubmitMelds }) {
    // Ordenamos los melds para display cada vez que cambie myMeld
    const orderedMelds = useMemo(() => {
        try {
            return orderMeldsForDisplaySimple(Array.isArray(myMeld) ? myMeld : []);
        } catch (e) {
            console.error("orderMeldsForDisplaySimple error:", e);
            return [];
        }
    }, [myMeld]);

    return (
        <div className=" w-[60em] max-w-full px-4">
            <button className="w-full flex flex-wrap  bg-black/30 p-2 gap-2 rounded-sm shadow-xl min-h-30 "

                onClick={() => handleSubmitMelds()}
            >

                {orderedMelds.length === 0 && (
                    <p className="text-gray-500 italic p-2">No se han bajado fichas.</p>
                )}

                {orderedMelds.map((meld, mIndex) => {
                    const meldKey = `meld-group-${mIndex}`;

                    return (
                        <button
                            onClick={() => handleAddToMeld(mIndex)}
                            key={meldKey}
                            className="flex items-center gap-1 p-1 h-fit rounded-md border-2 border-dashed border-slate-700 duration-100 hover:cursor-pointer hover:scale-105"
                        >
                            {meld.map((tile, tIndex) => {
                                const tileKey = `meld-${mIndex}-tile-${tIndex}-${tile?.color ?? "x"}-${tile?.number ?? "n"}`;
                                return (
                                    <div key={tileKey} className="flex items-center justify-center">
                                        <Tile card={tile} />
                                    </div>
                                );
                            })}
                        </button>
                    );
                })}
            </button>
        </div>
    );
}
