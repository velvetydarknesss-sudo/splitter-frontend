import { apiClient } from '@/features/auth/api';

/** A single settlement record */
export interface SettlementRecord {
  id: number;
  settledByUniqueId: string;
  amountSettled: number;
  notes: string | null;
  settledAt: string; // ISO date
}

/** Response from GET /settlements/:sessionId */
export interface SettlementsListResponse {
  sessionId: number;
  settlements: SettlementRecord[];
}

/** Request body for POST /settlements/:sessionId */
export interface MarkSettledRequest {
  settledByUniqueId: string;
  amountSettled?: number;
  notes?: string;
}

/** Response from POST /settlements/:sessionId */
export interface MarkSettledResponse {
  success: boolean;
  settlement: SettlementRecord;
}

/** Response from DELETE /settlements/:sessionId/:uniqueId */
export interface UnmarkSettledResponse {
  success: boolean;
  removed: boolean;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error('Unexpected error');
};

export const SettlementsApi = {
  /**
   * Fetch all settlements for a given session.
   */
  async list(sessionId: number): Promise<SettlementsListResponse> {
    try {
      const { data } = await apiClient.get<SettlementsListResponse>(
        `/settlements/${sessionId}`
      );
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Mark a participant as having paid their share.
   * Can be called by the session creator or the participant themselves.
   */
  async markSettled(
    sessionId: number,
    payload: MarkSettledRequest
  ): Promise<MarkSettledResponse> {
    try {
      const { data } = await apiClient.post<MarkSettledResponse>(
        `/settlements/${sessionId}`,
        payload
      );
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Remove a settlement record (mark debt as unpaid again).
   */
  async unmarkSettled(
    sessionId: number,
    settledByUniqueId: string
  ): Promise<UnmarkSettledResponse> {
    try {
      const { data } = await apiClient.delete<UnmarkSettledResponse>(
        `/settlements/${sessionId}/${encodeURIComponent(settledByUniqueId)}`
      );
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
