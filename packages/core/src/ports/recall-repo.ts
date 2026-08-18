export interface RecallRepo {
  logRecall(itemId: string, shownAt: Date, remembered: boolean): Promise<void>;
}
