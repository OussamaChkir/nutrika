"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { ALLERGY_OPTIONS, type AllergyOption } from "@/lib/allergens";
import { ALLERGY_I18N_KEYS } from "@/lib/allergy-i18n";
import {
    AGE_BANDS,
    ALLERGEN_STRICTNESS,
    CONDITIONS,
    DEFAULT_STRICTNESS,
    DIETS,
    GOALS,
    NAME_MAX_LENGTH,
    type AgeBand,
    type AllergenStrictness,
    type Condition,
    type Diet,
    type Goal,
} from "@/lib/profiles/constants";
import type { ProfileDto } from "@/lib/profiles/profile";
import { cn } from "@/lib/utils";

import { createProfile, deleteProfile, updateProfile, type ProfileActionError } from "./actions";

interface Props {
    initialProfiles: ProfileDto[];
    legacyAllergies: AllergyOption[];
    maxProfiles: number;
}

interface FormState {
    name: string;
    ageBand: AgeBand;
    conditions: Condition[];
    diets: Diet[];
    goals: Goal[];
    allergens: AllergyOption[];
    allergenStrictness: AllergenStrictness;
    isDefault: boolean;
    consent: boolean;
}

const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-orange-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            )}
        >
            {selected ? "✓ " : ""}
            {children}
        </button>
    );
}

export function PersonalProfileManager({ initialProfiles, legacyAllergies, maxProfiles }: Props) {
    const t = useTranslations("PersonalProfile");
    const tProfile = useTranslations("Profile");
    const [profiles, setProfiles] = useState(initialProfiles);
    // null = list only, "new" = creating, otherwise the id being edited
    const [editing, setEditing] = useState<string | "new" | null>(initialProfiles.length === 0 ? "new" : null);
    const [form, setForm] = useState<FormState>(() => blankForm(initialProfiles.length === 0, legacyAllergies));
    const [prefilled, setPrefilled] = useState(initialProfiles.length === 0 && legacyAllergies.length > 0);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
    const [pending, startTransition] = useTransition();

    const errorText = (error: ProfileActionError) => t(`errors.${error}`, { max: maxProfiles });

    function startNew() {
        setForm(blankForm(profiles.length === 0, legacyAllergies));
        setPrefilled(profiles.length === 0 && legacyAllergies.length > 0);
        setMessage(null);
        setEditing("new");
    }

    function startEdit(p: ProfileDto) {
        setForm({
            name: p.name,
            ageBand: p.ageBand,
            conditions: [...p.conditions],
            diets: [...p.diets],
            goals: [...p.goals],
            allergens: [...p.allergens],
            allergenStrictness: p.allergenStrictness,
            isDefault: p.isDefault,
            // Consent is asked again each time health data is saved.
            consent: false,
        });
        setPrefilled(false);
        setMessage(null);
        setEditing(p.id);
    }

    function applySaved(saved: ProfileDto) {
        setProfiles((prev) => {
            const others = prev.filter((p) => p.id !== saved.id).map((p) => (saved.isDefault ? { ...p, isDefault: false } : p));
            return [...others, saved].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
        });
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.consent) {
            setMessage({ kind: "error", text: t("consentRequired") });
            return;
        }
        startTransition(async () => {
            const creating = editing === "new";
            const result = creating ? await createProfile(form) : await updateProfile(editing as string, form);
            if (!result.ok) {
                setMessage({ kind: "error", text: errorText(result.error) });
                return;
            }
            applySaved(result.profile);
            if (creating) trackEvent("profile_created");
            setMessage({ kind: "ok", text: t("saved") });
            setEditing(null);
        });
    }

    function onDelete(p: ProfileDto) {
        if (!window.confirm(t("deleteConfirm"))) return;
        startTransition(async () => {
            const result = await deleteProfile(p.id);
            if (!result.ok) {
                setMessage({ kind: "error", text: errorText(result.error) });
                return;
            }
            setProfiles((prev) => {
                const rest = prev.filter((x) => x.id !== p.id);
                // The server promotes the oldest remaining profile when the default is deleted.
                if (p.isDefault && rest.length > 0 && !rest.some((x) => x.isDefault)) rest[0] = { ...rest[0], isDefault: true };
                return rest;
            });
            setMessage({ kind: "ok", text: t("deleted") });
            if (editing === p.id) setEditing(null);
        });
    }

    return (
        <div className="mt-6 space-y-5">
            {message && (
                <p
                    role={message.kind === "error" ? "alert" : "status"}
                    className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        message.kind === "error"
                            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"
                    )}
                >
                    {message.text}
                </p>
            )}

            {editing === null && (
                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg">{t("listTitle")}</CardTitle>
                        {profiles.length < maxProfiles && (
                            <Button size="sm" onClick={startNew} className="gap-1.5">
                                <Plus className="h-4 w-4" />
                                {t("create")}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {profiles.length === 0 && <p className="text-sm text-neutral-500">{t("empty")}</p>}
                        {profiles.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-neutral-900 dark:text-neutral-50">
                                        {p.name}
                                        {p.isDefault && (
                                            <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                {t("default")}
                                            </span>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-neutral-500">
                                        {[
                                            ...p.allergens.map((a) => tProfile(ALLERGY_I18N_KEYS[a])),
                                            ...p.conditions.map((c) => t(`conditions.${c}`)),
                                            ...p.diets.map((d) => t(`diets.${d}`)),
                                            ...p.goals.map((g) => t(`goals.${g}`)),
                                        ].join(" · ")}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => startEdit(p)} disabled={pending} className="gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t("edit")}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => onDelete(p)} disabled={pending} className="gap-1.5 text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t("delete")}
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {editing !== null && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{editing === "new" ? t("createTitle") : t("editTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="profile-name">{t("nameLabel")}</Label>
                                    <Input
                                        id="profile-name"
                                        value={form.name}
                                        maxLength={NAME_MAX_LENGTH}
                                        placeholder={t("namePlaceholder")}
                                        required
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-medium">{t("ageBandLabel")}</legend>
                                    <div className="flex flex-wrap gap-2">
                                        {AGE_BANDS.map((band) => (
                                            <Chip key={band} selected={form.ageBand === band} onClick={() => setForm({ ...form, ageBand: band })}>
                                                {t(`ageBands.${band}`)}
                                            </Chip>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium">{t("allergensLabel")}</legend>
                                <p className="text-xs text-neutral-500">{t("allergensHint")}</p>
                                {prefilled && form.allergens.length > 0 && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400">{t("allergensPrefilled")}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {ALLERGY_OPTIONS.map((a) => (
                                        <Chip key={a} selected={form.allergens.includes(a)} onClick={() => setForm({ ...form, allergens: toggle(form.allergens, a) })}>
                                            {tProfile(ALLERGY_I18N_KEYS[a])}
                                        </Chip>
                                    ))}
                                </div>
                            </fieldset>

                            {form.allergens.length > 0 && (
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-medium">{t("strictnessLabel")}</legend>
                                    {ALLERGEN_STRICTNESS.map((s) => (
                                        <label
                                            key={s}
                                            className={cn(
                                                "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                                                form.allergenStrictness === s
                                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                                                    : "border-neutral-200 dark:border-neutral-800"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="strictness"
                                                className="mt-1"
                                                checked={form.allergenStrictness === s}
                                                onChange={() => setForm({ ...form, allergenStrictness: s })}
                                            />
                                            <span>
                                                <span className="block text-sm font-semibold">{t(`strictness.${s}.label`)}</span>
                                                <span className="block text-xs text-neutral-600 dark:text-neutral-400">{t(`strictness.${s}.desc`)}</span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}

                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium">{t("conditionsLabel")}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {CONDITIONS.map((c) => (
                                        <Chip key={c} selected={form.conditions.includes(c)} onClick={() => setForm({ ...form, conditions: toggle(form.conditions, c) })}>
                                            {t(`conditions.${c}`)}
                                        </Chip>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium">{t("dietsLabel")}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {DIETS.map((d) => (
                                        <Chip key={d} selected={form.diets.includes(d)} onClick={() => setForm({ ...form, diets: toggle(form.diets, d) })}>
                                            {t(`diets.${d}`)}
                                        </Chip>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium">{t("goalsLabel")}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {GOALS.map((g) => (
                                        <Chip key={g} selected={form.goals.includes(g)} onClick={() => setForm({ ...form, goals: toggle(form.goals, g) })}>
                                            {t(`goals.${g}`)}
                                        </Chip>
                                    ))}
                                </div>
                            </fieldset>

                            {profiles.length > 0 && (
                                <label className="flex items-start gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={form.isDefault}
                                        onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                                    />
                                    <span>
                                        {t("makeDefault")}
                                        <span className="block text-xs text-neutral-500">{t("defaultHint")}</span>
                                    </span>
                                </label>
                            )}

                            <MedicalDisclaimer />

                            <label className="flex items-start gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={form.consent}
                                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                                />
                                <span>
                                    {t("consent")}{" "}
                                    <Link href="/privacy" className="font-medium text-orange-600 underline" target="_blank">
                                        {t("privacyLink")}
                                    </Link>
                                </span>
                            </label>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={pending} className="flex-1 gap-2">
                                    {pending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t("saving")}
                                        </>
                                    ) : (
                                        t("save")
                                    )}
                                </Button>
                                {profiles.length > 0 && (
                                    <Button type="button" variant="outline" disabled={pending} onClick={() => { setEditing(null); setMessage(null); }}>
                                        {t("cancel")}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function blankForm(isFirst: boolean, legacyAllergies: AllergyOption[]): FormState {
    return {
        name: "",
        ageBand: "adult",
        conditions: [],
        diets: [],
        goals: [],
        allergens: isFirst ? [...legacyAllergies] : [],
        allergenStrictness: DEFAULT_STRICTNESS,
        isDefault: false,
        consent: false,
    };
}
