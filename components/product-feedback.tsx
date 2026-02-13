"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Lock, Loader2, MessageSquare } from "lucide-react";

interface Feedback {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: {
        name: string | null;
        image: string | null;
    };
}

interface ProductFeedbackProps {
    barcode: string;
    userRole?: string;
    userId?: string;
}

export function ProductFeedback({
    barcode,
    userRole,
    userId,
}: ProductFeedbackProps) {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const isPremium = userRole === "PREMIUM" || userRole === "ADMIN";

    useEffect(() => {
        fetch(`/api/products/${barcode}/feedback`)
            .then((res) => res.json())
            .then((data) => {
                setFeedbacks(data.feedbacks || []);
                // Check if current user already submitted
                if (userId) {
                    const existing = (data.feedbacks || []).find(
                        (f: Feedback & { userId?: string }) =>
                            f.userId === userId
                    );
                    if (existing) {
                        setRating(existing.rating);
                        setComment(existing.comment || "");
                        setHasSubmitted(true);
                    }
                }
            })
            .catch(() => { })
            .finally(() => setIsLoading(false));
    }, [barcode, userId]);

    const handleSubmit = async () => {
        if (rating === 0) {
            setSubmitError("Please select a rating");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch(`/api/products/${barcode}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment: comment || undefined }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit");
            }

            setHasSubmitted(true);

            // Refresh feedbacks
            const refreshRes = await fetch(
                `/api/products/${barcode}/feedback`
            );
            const refreshData = await refreshRes.json();
            setFeedbacks(refreshData.feedbacks || []);
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Failed to submit"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const avgRating =
        feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
            : 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5" />
                    Product Reviews
                    {feedbacks.length > 0 && (
                        <span className="text-sm font-normal text-neutral-500">
                            ({feedbacks.length})
                        </span>
                    )}
                </CardTitle>
                {feedbacks.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-neutral-500">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`h-4 w-4 ${s <= Math.round(avgRating)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-neutral-300 dark:text-neutral-600"
                                        }`}
                                />
                            ))}
                        </div>
                        <span>{avgRating.toFixed(1)} average</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <>
                        {/* Submit form (premium only) */}
                        {userId && isPremium ? (
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    {hasSubmitted
                                        ? "Update your review"
                                        : "Leave a review"}
                                </p>

                                {/* Star rating */}
                                <div className="mb-3 flex gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onMouseEnter={() =>
                                                setHoverRating(s)
                                            }
                                            onMouseLeave={() =>
                                                setHoverRating(0)
                                            }
                                            onClick={() => setRating(s)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`h-7 w-7 ${s <=
                                                        (hoverRating || rating)
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : "text-neutral-300 dark:text-neutral-600"
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Comment */}
                                <textarea
                                    value={comment}
                                    onChange={(e) =>
                                        setComment(e.target.value)
                                    }
                                    placeholder="Share your thoughts about this product... (optional)"
                                    className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                    rows={3}
                                    maxLength={500}
                                />

                                {submitError && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {submitError}
                                    </p>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || rating === 0}
                                    className="mt-3 w-full"
                                    size="sm"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : hasSubmitted ? (
                                        "Update Review"
                                    ) : (
                                        "Submit Review"
                                    )}
                                </Button>
                            </div>
                        ) : userId && !isPremium ? (
                            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 p-6 text-center dark:border-orange-800 dark:bg-orange-900/10">
                                <Lock className="h-8 w-8 text-orange-400" />
                                <p className="font-medium text-neutral-700 dark:text-neutral-300">
                                    Premium Feature
                                </p>
                                <p className="text-sm text-neutral-500">
                                    Upgrade to Premium to leave reviews and help
                                    others make better choices.
                                </p>
                            </div>
                        ) : null}

                        {/* Feedback list */}
                        {feedbacks.length > 0 ? (
                            <div className="space-y-3">
                                {feedbacks.map((fb) => (
                                    <div
                                        key={fb.id}
                                        className="flex gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800"
                                    >
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={
                                                    fb.user.image || undefined
                                                }
                                            />
                                            <AvatarFallback className="text-xs">
                                                {fb.user.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                    {fb.user.name || "User"}
                                                </span>
                                                <div className="flex">
                                                    {[1, 2, 3, 4, 5].map(
                                                        (s) => (
                                                            <Star
                                                                key={s}
                                                                className={`h-3 w-3 ${s <=
                                                                        fb.rating
                                                                        ? "fill-yellow-400 text-yellow-400"
                                                                        : "text-neutral-300 dark:text-neutral-600"
                                                                    }`}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            {fb.comment && (
                                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                                    {fb.comment}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-neutral-400">
                                                {new Date(
                                                    fb.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-2 text-center text-sm text-neutral-500">
                                No reviews yet. Be the first!
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
