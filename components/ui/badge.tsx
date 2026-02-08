import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-gradient-to-r from-orange-400 to-orangina-300 text-white shadow-lg shadow-orange-400/20",
                secondary:
                    "border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
                destructive:
                    "border-transparent bg-red-500 text-white shadow-lg shadow-red-500/20",
                warning:
                    "border-transparent bg-amber-500 text-white shadow-lg shadow-amber-500/20",
                success:
                    "border-transparent bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                outline: "border-neutral-200 text-neutral-900 dark:border-neutral-700 dark:text-neutral-100",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
