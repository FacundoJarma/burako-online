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
        <div className=" w-[60em] max-w-full px-4 perspective-midrange">
            <button className="w-full flex flex-wrap gap-2 rounded-sm min-h-40 p-2 bg-black/20 transform-gpu origin-bottom rotate-x-[20deg] "
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
                            className={`flex items-center gap-1 p-1 h-fit rounded-md border-2 
                                 duration-100 hover:cursor-pointer hover:scale-105
                                 ${
                                     meld.length >= 7
                                         ? "border-1 border-green-900"
                                         : "border-dashed border-slate-700"
                                 }`}
                        >
                            {meld.map((tile, tIndex) => {
                                const tileKey = `meld-${mIndex}-tile-${tIndex}-${tile?.color ?? "x"}-${tile?.number ?? "n"}`;
                                return (
                                    <div 
                                        key={tileKey} 
                                        className={`
                                            flex items-center justify-center 
                                            // Clases de Tailwind para animación de aparecer:
                                            // 1. Estado Inicial (oculto/desplazado, se aplica en la primera aparición)
                                            opacity-0 transform translate-y-2
                                            // 2. Transición y Duración
                                            transition-all duration-300 ease-out 
                                            // 3. Estado Final (opacidad 100%, posición normal)
                                            data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0
                                        `}
                                        // Usamos un estilo dinámico para añadir un retraso secuencial
                                        style={{ transitionDelay: `${tIndex * 50}ms` }}
                                        // El atributo data-visible se usa para forzar el estado final
                                        data-visible={true}
                                    >
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
