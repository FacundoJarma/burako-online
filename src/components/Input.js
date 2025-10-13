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
                className="block text-sm font-medium text-slate-700 mb-2"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
        </div>
    )
}
