import { create } from 'zustand';
import {
  SettlementsApi,
  type SettlementRecord,
} from '@/features/sessions/api/settlements.api';

interface SettlementsState {
  /** Map of sessionId -> Set of settledByUniqueIds that are marked as paid */
  settledMap: Record<number, SettlementRecord[]>;
  loadingMap: Record<number, boolean>;
  errorMap: Record<number, string | undefined>;
}

interface SettlementsActions {
  /** Fetch settlements for a session */
  fetchSettlements: (sessionId: number) => Promise<void>;

  /** Mark a participant as paid. Returns the updated settlement record. */
  markSettled: (
    sessionId: number,
    settledByUniqueId: string,
    amountSettled?: number,
    notes?: string
  ) => Promise<void>;

  /** Unmark a settlement (debt becomes unpaid again) */
  unmarkSettled: (sessionId: number, settledByUniqueId: string) => Promise<void>;

  /** Check if a specific participant is settled in a session */
  isSettled: (sessionId: number, uniqueId: string) => boolean;

  /** Get all settlements for a session */
  getSettlements: (sessionId: number) => SettlementRecord[];

  /** Clear settlements for a specific session (e.g., on unmount) */
  clearSession: (sessionId: number) => void;
}

type SettlementsStore = SettlementsState & SettlementsActions;

const initialState: SettlementsState = {
  settledMap: {},
  loadingMap: {},
  errorMap: {},
};

export const useSettlementsStore = create<SettlementsStore>((set, get) => ({
  ...initialState,

  async fetchSettlements(sessionId) {
    set((state) => ({
      loadingMap: { ...state.loadingMap, [sessionId]: true },
      errorMap: { ...state.errorMap, [sessionId]: undefined },
    }));

    try {
      const response = await SettlementsApi.list(sessionId);
      set((state) => ({
        settledMap: { ...state.settledMap, [sessionId]: response.settlements },
        loadingMap: { ...state.loadingMap, [sessionId]: false },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load settlements';
      set((state) => ({
        errorMap: { ...state.errorMap, [sessionId]: message },
        loadingMap: { ...state.loadingMap, [sessionId]: false },
      }));
      console.error('[SettlementsStore] fetchSettlements error:', error);
    }
  },

  async markSettled(sessionId, settledByUniqueId, amountSettled, notes) {
    set((state) => ({
      loadingMap: { ...state.loadingMap, [sessionId]: true },
      errorMap: { ...state.errorMap, [sessionId]: undefined },
    }));

    try {
      const response = await SettlementsApi.markSettled(sessionId, {
        settledByUniqueId,
        amountSettled: amountSettled ?? 0,
        notes,
      });

      // Optimistically update the store
      set((state) => {
        const current = state.settledMap[sessionId] ?? [];
        // Replace if exists, otherwise add
        const exists = current.find(
          (s) => s.settledByUniqueId === settledByUniqueId
        );
        const updated = exists
          ? current.map((s) =>
              s.settledByUniqueId === settledByUniqueId
                ? response.settlement
                : s
            )
          : [...current, response.settlement];

        return {
          settledMap: { ...state.settledMap, [sessionId]: updated },
          loadingMap: { ...state.loadingMap, [sessionId]: false },
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to mark as settled';
      set((state) => ({
        errorMap: { ...state.errorMap, [sessionId]: message },
        loadingMap: { ...state.loadingMap, [sessionId]: false },
      }));
      throw error; // re-throw for UI error handling
    }
  },

  async unmarkSettled(sessionId, settledByUniqueId) {
    set((state) => ({
      loadingMap: { ...state.loadingMap, [sessionId]: true },
      errorMap: { ...state.errorMap, [sessionId]: undefined },
    }));

    try {
      await SettlementsApi.unmarkSettled(sessionId, settledByUniqueId);

      set((state) => {
        const current = state.settledMap[sessionId] ?? [];
        const updated = current.filter(
          (s) => s.settledByUniqueId !== settledByUniqueId
        );
        return {
          settledMap: { ...state.settledMap, [sessionId]: updated },
          loadingMap: { ...state.loadingMap, [sessionId]: false },
        };
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to unmark settlement';
      set((state) => ({
        errorMap: { ...state.errorMap, [sessionId]: message },
        loadingMap: { ...state.loadingMap, [sessionId]: false },
      }));
      throw error;
    }
  },

  isSettled(sessionId, uniqueId) {
    const settlements = get().settledMap[sessionId] ?? [];
    return settlements.some((s) => s.settledByUniqueId === uniqueId);
  },

  getSettlements(sessionId) {
    return get().settledMap[sessionId] ?? [];
  },

  clearSession(sessionId) {
    set((state) => {
      const { [sessionId]: _s, ...restSettled } = state.settledMap;
      const { [sessionId]: _l, ...restLoading } = state.loadingMap;
      const { [sessionId]: _e, ...restError } = state.errorMap;
      return {
        settledMap: restSettled,
        loadingMap: restLoading,
        errorMap: restError,
      };
    });
  },
}));
