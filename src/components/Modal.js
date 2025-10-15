import React from 'react'
import { Input } from './Input'
import { IconX } from '@tabler/icons-react'
import Button from './Button'
function Modal({ children, open, setOpen }) {
    return (
        <>
            <div
                onClick={() => setOpen(false)}
                className='z-10 w-screen h-screen fixed bg-black top-0 left-0 flex items-center justify-center duration-300'
                style={
                    {
                        opacity: open ? "70%" : "0%",
                        pointerEvents: open ? "all" : "none"
                    }
                }>
            </div>
            <div
                style={
                    {
                        opacity: open ? "100%" : "0%",
                        pointerEvents: open ? "all" : "none"
                    }
                }
                className="duration-300 w-full max-w-md z-20 bg-slate-900 absolute rounded-2xl border border-slate-800 p-6 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">

                <button className='absolute top-4 right-4 hover:cursor-pointer'
                    onClick={() => setOpen(false)}>
                    <IconX />
                </button>

                {children}
            </div>
        </>

    )
}

export default Modal