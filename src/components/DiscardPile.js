import React from 'react'
import Tile from './Tile'
import * as motion from "motion/react-client"
function DiscardPile({ discardPile, turnStep, isMyTurn, handleDraw, handleDiscard }) {

    return (
        <motion.div
            whileHover={{ scale: 1.1 }
            }
            whileTap={{ scale: 0.8 }} className='perspective-midrange'>
            <button

                className={`
                    transform-gpu origin-bottom rotate-x-[25deg] -rotate-y-10 rotate-z-5
            ${isMyTurn && turnStep === 'choose_draw' || turnStep === 'melds' ? 'hover:cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
            grid grid-cols-4 grid-rows-4 w-[10em] min-h-48  p-2 rounded-2xl gap-2 bg-black/40 duration-100`}

                onClick={
                    isMyTurn &&
                        turnStep === 'melds' ? () => handleDiscard() :
                        turnStep === 'choose_draw' ? () => handleDraw('discard') : () => { }
                }
            >
                {
                    discardPile.map((tile, index) => (
                        <Tile key={index} card={tile} />
                    ))
                }
            </button>

        </motion.div>
    )
}

export default DiscardPile