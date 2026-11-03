// F3: the contract between the UI and the server actions. The components only know these types
// (and receive the actions as props), so Storybook can use stubs and never bundle server code.

import type { ListItem } from "./list";
import type { SavedState } from "./rules";

export type ActionError = "unauthorized" | "invalid" | "not_found" | "limit" | "disabled" | "failed";
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: ActionError };

export interface ShoppingListActions {
    add(input: { label: string; quantity?: number }): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>>;
    setQuantity(id: string, quantity: number): Promise<ActionResult>;
    setChecked(id: string, checked: boolean): Promise<ActionResult>;
    remove(id: string): Promise<ActionResult>;
    clearChecked(): Promise<ActionResult>;
}

export interface ProductSaveActions {
    setState(barcode: string, requested: SavedState): Promise<ActionResult<{ state: SavedState | null }>>;
    addToList(barcode: string): Promise<ActionResult<{ firstItem: boolean }>>;
}

/** A saved (approved or avoided) product as shown on the list page. */
export interface SavedProductView {
    barcode: string;
    name: string;
    brand: string | null;
    score: number;
    scoreLetter: string;
    state: SavedState;
}
