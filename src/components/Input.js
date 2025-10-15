"use client"

import React from "react"

export function Input({
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder = "",
    required = false
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-medium text-slate-100 mb-2"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="text-white w-full text-sm flex items-center px-4 py-2 bg-slate-600 border-3 border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
        </div>
    )
}
